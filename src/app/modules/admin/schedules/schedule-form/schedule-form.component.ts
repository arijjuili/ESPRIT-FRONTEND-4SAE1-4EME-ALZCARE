import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationScheduleService } from '../../../../core/services/notification-schedule.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ValidationUtils } from '../../../../core/utils/validation.utils';
import {
    CreateScheduleRequest,
    ScheduleType,
    TargetRole,
    NotificationChannel,
    SCHEDULE_TYPE_LABELS,
    TARGET_ROLE_LABELS,
    CHANNEL_LABELS,
    TEMPLATE_VARIABLES,
    COMMON_CRON_EXPRESSIONS,
    TIMEZONES,
    NotificationSchedule
} from '../../../../core/models';

@Component({
    selector: 'app-schedule-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './schedule-form.component.html',
    styleUrls: ['./schedule-form.component.scss']
})
export class ScheduleFormComponent implements OnInit {
    isEditMode = false;
    scheduleId: string | null = null;
    loading = false;
    saving = false;

    // Form Model
    form: CreateScheduleRequest = {
        name: '',
        description: '',
        targetRole: 'PATIENT',
        targetUserIds: [],
        titleTemplate: '',
        messageTemplate: '',
        type: 'REMINDER',
        priority: 'NORMAL',
        channels: ['IN_APP'],
        scheduleType: 'INTERVAL',
        intervalMinutes: 180,
        cronExpression: '',
        startDate: this.getDefaultStartDate(),
        endDate: '',
        timezone: 'UTC',
        active: true
    };

    // Dropdown Options
    scheduleTypes: ScheduleType[] = ['INTERVAL', 'CRON', 'ONE_TIME'];
    targetRoles: TargetRole[] = ['PATIENT', 'CAREGIVER', 'DOCTOR', 'ALL'];
    notificationTypes = ['ALERT', 'REMINDER', 'SYSTEM', 'EMERGENCY'];
    priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
    allChannels: NotificationChannel[] = ['IN_APP', 'SMS', 'EMAIL', 'PUSH'];

    // UI Helpers
    scheduleTypeLabels = SCHEDULE_TYPE_LABELS;
    targetRoleLabels = TARGET_ROLE_LABELS;
    channelLabels = CHANNEL_LABELS;
    templateVariables = TEMPLATE_VARIABLES;
    commonCronExpressions = COMMON_CRON_EXPRESSIONS;
    timezones = TIMEZONES;

    constructor(
        private scheduleService: NotificationScheduleService,
        private toastService: ToastService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.scheduleId = this.route.snapshot.paramMap.get('id');
        if (this.scheduleId) {
            this.isEditMode = true;
            this.loadSchedule();
        }
    }

    loadSchedule(): void {
        if (!this.scheduleId) return;

        this.loading = true;
        this.scheduleService.getScheduleById(this.scheduleId).subscribe({
            next: (schedule: NotificationSchedule) => {
                this.form = {
                    name: schedule.name,
                    description: schedule.description,
                    targetRole: schedule.targetRole,
                    targetUserIds: schedule.targetUserIds,
                    titleTemplate: schedule.titleTemplate,
                    messageTemplate: schedule.messageTemplate,
                    type: schedule.type,
                    priority: schedule.priority,
                    channels: schedule.channels,
                    scheduleType: schedule.scheduleType,
                    intervalMinutes: schedule.intervalMinutes,
                    cronExpression: schedule.cronExpression,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    timezone: schedule.timezone,
                    active: schedule.active
                };
                this.loading = false;
            },
            error: (error) => {
                console.error('Failed to load schedule:', error);
                this.toastService.error('Failed to load schedule');
                this.loading = false;
                this.router.navigate(['/admin/schedules']);
            }
        });
    }

    onSubmit(): void {
        if (!this.validateForm()) {
            return;
        }

        this.saving = true;

        const request = this.prepareRequest();

        const operation = this.isEditMode && this.scheduleId
            ? this.scheduleService.updateSchedule(this.scheduleId, request)
            : this.scheduleService.createSchedule(request);

        operation.subscribe({
            next: () => {
                this.toastService.success(
                    this.isEditMode ? 'Schedule updated successfully' : 'Schedule created successfully'
                );
                this.router.navigate(['/admin/schedules']);
            },
            error: (error) => {
                console.error('Failed to save schedule:', error);
                this.toastService.error('Failed to save schedule');
                this.saving = false;
            }
        });
    }

    prepareRequest(): CreateScheduleRequest {
        const request: CreateScheduleRequest = { ...this.form };

        // Format dates with timezone for Instant deserialization
        if (request.startDate) {
            request.startDate = this.formatDateForBackend(request.startDate);
        }
        if (request.endDate) {
            request.endDate = this.formatDateForBackend(request.endDate);
        }

        // Clean up based on schedule type
        if (request.scheduleType === 'INTERVAL') {
            delete request.cronExpression;
        } else if (request.scheduleType === 'CRON') {
            delete request.intervalMinutes;
        } else if (request.scheduleType === 'ONE_TIME') {
            delete request.intervalMinutes;
            delete request.cronExpression;
        }

        // Remove empty endDate
        if (!request.endDate) {
            delete request.endDate;
        }

        return request;
    }

    private formatDateForBackend(dateValue: string): string {
        // Convert local datetime string to UTC Instant format
        // Input: "2024-01-01T10:00" -> Output: "2024-01-01T10:00:00Z"
        if (!dateValue) return '';
        
        // If already has Z, return as-is
        if (dateValue.endsWith('Z')) return dateValue;
        
        // Append seconds and Z for UTC
        return dateValue + ':00Z';
    }

    private readonly MAX_NAME_LENGTH = 100;
    private readonly MAX_INTERVAL_MINUTES = 525600; // 1 year in minutes

    validateForm(): boolean {
        const trimmedName = this.form.name?.trim() || '';
        const trimmedTitle = this.form.titleTemplate?.trim() || '';
        const trimmedMessage = this.form.messageTemplate?.trim() || '';

        if (!ValidationUtils.isNotEmpty(trimmedName)) {
            this.toastService.error('Schedule name is required');
            return false;
        }

        if (!ValidationUtils.hasMaxLength(trimmedName, this.MAX_NAME_LENGTH)) {
            this.toastService.error(`Schedule name must not exceed ${this.MAX_NAME_LENGTH} characters`);
            return false;
        }

        if (!ValidationUtils.isNotEmpty(trimmedTitle)) {
            this.toastService.error('Title template is required');
            return false;
        }

        if (!ValidationUtils.isNotEmpty(trimmedMessage)) {
            this.toastService.error('Message template is required');
            return false;
        }

        if (this.form.scheduleType === 'INTERVAL') {
            if (!this.form.intervalMinutes || this.form.intervalMinutes < 1) {
                this.toastService.error('Interval minutes must be at least 1');
                return false;
            }
            if (this.form.intervalMinutes > this.MAX_INTERVAL_MINUTES) {
                this.toastService.error(`Interval must not exceed ${this.MAX_INTERVAL_MINUTES} minutes (1 year)`);
                return false;
            }
        }

        if (this.form.scheduleType === 'CRON') {
            if (!ValidationUtils.isNotEmpty(this.form.cronExpression)) {
                this.toastService.error('Cron expression is required');
                return false;
            }
            const cronExpr = this.form.cronExpression!;
            if (!ValidationUtils.isValidCronExpression(cronExpr)) {
                this.toastService.error('Invalid cron expression format');
                return false;
            }
        }

        if (this.form.channels.length === 0) {
            this.toastService.error('At least one channel must be selected');
            return false;
        }

        if (!this.form.startDate) {
            this.toastService.error('Start date is required');
            return false;
        }

        // Validate date range using ValidationUtils
        if (this.form.endDate && !ValidationUtils.isValidDateRange(this.form.startDate, this.form.endDate)) {
            this.toastService.error('End date must be after start date');
            return false;
        }

        return true;
    }

    toggleChannel(channel: NotificationChannel): void {
        const index = this.form.channels.indexOf(channel);
        if (index > -1) {
            this.form.channels.splice(index, 1);
        } else {
            this.form.channels.push(channel);
        }
    }

    isChannelSelected(channel: NotificationChannel): boolean {
        return this.form.channels.includes(channel);
    }

    insertVariable(variable: string, field: 'title' | 'message'): void {
        if (field === 'title') {
            this.form.titleTemplate += variable;
        } else {
            this.form.messageTemplate += variable;
        }
    }

    useCronTemplate(expression: string): void {
        this.form.cronExpression = expression;
    }

    cancel(): void {
        this.router.navigate(['/admin/schedules']);
    }

    private getDefaultStartDate(): string {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5); // Default to 5 minutes from now
        return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    }
}
