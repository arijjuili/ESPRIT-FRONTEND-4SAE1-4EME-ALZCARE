import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationScheduleService } from '../../../../core/services/notification-schedule.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
    NotificationSchedule,
    PagedScheduleResponse,
    SCHEDULE_TYPE_ICONS,
    SCHEDULE_TYPE_LABELS,
    TARGET_ROLE_ICONS,
    CHANNEL_ICONS
} from '../../../../core/models';

@Component({
    selector: 'app-schedule-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './schedule-list.component.html',
    styleUrls: ['./schedule-list.component.scss']
})
export class ScheduleListComponent implements OnInit {
    schedules: NotificationSchedule[] = [];
    loading = false;
    error: string | null = null;

    // Pagination
    currentPage = 0;
    pageSize = 10;
    totalPages = 0;
    totalElements = 0;

    // UI Helpers
    scheduleTypeIcons = SCHEDULE_TYPE_ICONS;
    scheduleTypeLabels = SCHEDULE_TYPE_LABELS;
    targetRoleIcons = TARGET_ROLE_ICONS;
    channelIcons = CHANNEL_ICONS;
    Math = Math; // Expose Math to template

    constructor(
        private scheduleService: NotificationScheduleService,
        private toastService: ToastService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadSchedules();
    }

    loadSchedules(): void {
        this.loading = true;
        this.error = null;

        this.scheduleService.getSchedules(this.currentPage, this.pageSize).subscribe({
            next: (response: PagedScheduleResponse) => {
                this.schedules = response.content;
                this.totalPages = response.totalPages;
                this.totalElements = response.totalElements;
                this.loading = false;
            },
            error: (error) => {
                this.error = 'Failed to load notification schedules. Please try again.';
                this.loading = false;
                this.toastService.error('Failed to load schedules. Click to retry.');
            }
        });
    }

    createSchedule(): void {
        this.router.navigate(['/admin/schedules/new']);
    }

    editSchedule(id: string): void {
        this.router.navigate(['/admin/schedules/edit', id]);
    }

    toggleSchedule(schedule: NotificationSchedule): void {
        this.scheduleService.toggleSchedule(schedule.id).subscribe({
            next: (updated) => {
                schedule.active = updated.active;
                this.toastService.success(
                    updated.active ? 'Schedule enabled' : 'Schedule disabled'
                );
            },
            error: (error) => {
                this.toastService.error('Failed to toggle schedule. Please try again.');
            }
        });
    }

    triggerSchedule(schedule: NotificationSchedule): void {
        if (!confirm(`Manually trigger "${schedule.name}"? This will send notifications immediately.`)) {
            return;
        }

        this.scheduleService.triggerSchedule(schedule.id).subscribe({
            next: () => {
                this.toastService.success('Schedule triggered successfully');
                this.loadSchedules(); // Refresh to update execution stats
            },
            error: (error) => {
                this.toastService.error('Failed to trigger schedule. Please try again.');
            }
        });
    }

    deleteSchedule(schedule: NotificationSchedule): void {
        if (!confirm(`Delete "${schedule.name}"? This action cannot be undone.`)) {
            return;
        }

        this.scheduleService.deleteSchedule(schedule.id).subscribe({
            next: () => {
                this.toastService.success('Schedule deleted');
                this.loadSchedules();
            },
            error: (error) => {
                this.toastService.error('Failed to delete schedule. Please try again.');
            }
        });
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.loadSchedules();
        }
    }

    previousPage(): void {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadSchedules();
        }
    }

    goToPage(page: number): void {
        this.currentPage = page;
        this.loadSchedules();
    }

    getScheduleTypeDisplay(schedule: NotificationSchedule): string {
        if (schedule.scheduleType === 'INTERVAL') {
            return `Every ${schedule.intervalMinutes} minutes`;
        } else if (schedule.scheduleType === 'CRON') {
            return schedule.cronExpression || 'Cron';
        } else {
            return 'One-time';
        }
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    }
}
