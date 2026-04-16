import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ActivityService } from '../../../../core/services/activity.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ActivityResponse, Registration } from '../../../../core/models/activity.model';
import * as L from 'leaflet';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './activity-detail.component.html'
})
export class ActivityDetailComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private patientId = '';
  private map?: L.Map;

  activity: ActivityResponse | null = null;
  loading = false;
  error: string | null = null;
  mapLoading = false;
  mapError: string | null = null;
  suggestedLocations: NominatimResult[] = [];

  // Registration state
  existingRegistration: Registration | null = null;
  checkingRegistration = false;
  registering = false;
  cancelling = false;
  specialNeeds = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityService: ActivityService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.patientId = user.id;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActivity(id);
    } else {
      this.error = 'Invalid activity ID';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  loadActivity(id: string): void {
    this.loading = true;
    this.activityService.getActivity(id)
      .pipe(
        catchError(() => {
          this.error = 'Failed to load activity details';
          return of(null);
        }),
        finalize(() => { this.loading = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(activity => {
        if (activity) {
          this.activity = activity;
          if (this.patientId) this.checkRegistration(activity.id);
          // Wait for DOM to render the map container
          setTimeout(() => this.loadMapData(), 0);
        }
      });
  }

  private async loadMapData(): Promise<void> {
    if (!this.activity || !this.mapContainer) return;

    this.mapLoading = true;
    this.mapError = null;
    this.suggestedLocations = [];

    let centerLat = this.activity.latitude ?? null;
    let centerLon = this.activity.longitude ?? null;

    // If backend didn't provide coordinates, geocode the location string
    if (centerLat == null || centerLon == null) {
      const geo = await this.geocode(this.activity.location);
      if (geo) {
        centerLat = parseFloat(geo.lat);
        centerLon = parseFloat(geo.lon);
      }
    }

    if (centerLat == null || centerLon == null) {
      this.mapError = 'Could not find coordinates for this location.';
      this.mapLoading = false;
      return;
    }

    // Find nearby similar locations
    const nearby = await this.searchNearby(this.activity.location, centerLat, centerLon);
    // Deduplicate and filter out exact coordinate duplicates
    const seen = new Set<string>();
    const deduped: NominatimResult[] = [];
    for (const place of nearby) {
      const key = `${place.lat},${place.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(place);
      }
    }

    this.suggestedLocations = deduped.slice(0, 4);
    this.initMap(centerLat, centerLon);
    this.mapLoading = false;
  }

  private async geocode(query: string): Promise<NominatimResult | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      return data[0] || null;
    } catch {
      return null;
    }
  }

  private async searchNearby(query: string, lat: number, lon: number): Promise<NominatimResult[]> {
    // ~7km bounding box for local ranking
    const delta = 0.06;
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&viewbox=${viewbox}&bounded=0`;
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      return data || [];
    } catch {
      return [];
    }
  }

  private initMap(centerLat: number, centerLon: number): void {
    if (!this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Custom icons
    const primaryIcon = L.divIcon({
      className: 'custom-marker-primary',
      html: `<div style="width:24px;height:24px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const suggestionIcon = L.divIcon({
      className: 'custom-marker-suggestion',
      html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    const bounds = L.latLngBounds([]);
    let primarySet = false;

    for (const place of this.suggestedLocations) {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

      bounds.extend([lat, lon]);

      if (!primarySet) {
        // First result = activity location
        L.marker([lat, lon], { icon: primaryIcon })
          .addTo(this.map)
          .bindPopup(`<strong>${this.activity?.title || 'Activity'}</strong><br/>${place.display_name}`);
        primarySet = true;
      } else {
        L.marker([lat, lon], { icon: suggestionIcon })
          .addTo(this.map)
          .bindPopup(`<strong>Suggested nearby</strong><br/>${place.display_name}`);
      }
    }

    // If no suggestions returned at all, still mark the center
    if (!primarySet) {
      bounds.extend([centerLat, centerLon]);
      L.marker([centerLat, centerLon], { icon: primaryIcon })
        .addTo(this.map)
        .bindPopup(`<strong>${this.activity?.title || 'Activity'}</strong><br/>${this.activity?.location || ''}`);
    }

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    } else {
      this.map.setView([centerLat, centerLon], 14);
    }

    // Ensure Leaflet recalculates container size after layout settles
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  checkRegistration(activityId: string): void {
    this.checkingRegistration = true;
    this.activityService.checkPatientRegistered(activityId, this.patientId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => { this.checkingRegistration = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(reg => { this.existingRegistration = reg; });
  }

  register(): void {
    if (!this.activity || !this.patientId) return;
    this.registering = true;
    this.activityService.registerForActivity({
      activityId: this.activity.id,
      patientId: this.patientId,
      specialNeeds: this.specialNeeds || undefined
    })
      .pipe(
        catchError(err => {
          const msg = err.error?.message || err.error?.detail || 'Registration failed';
          this.toastService.error(msg);
          return of(null);
        }),
        finalize(() => { this.registering = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(reg => {
        if (reg) {
          this.existingRegistration = reg;
          if (this.activity) this.activity.registeredCount++;
          this.specialNeeds = '';
          this.toastService.success('You\'re registered! See My Registrations for details.');
        }
      });
  }

  cancelRegistration(): void {
    if (!this.existingRegistration) return;
    this.cancelling = true;
    this.activityService.cancelRegistration(this.existingRegistration.id)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to cancel registration');
          return of(undefined);
        }),
        finalize(() => { this.cancelling = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.existingRegistration = null;
        if (this.activity) this.activity.registeredCount = Math.max(0, this.activity.registeredCount - 1);
        this.toastService.success('Registration cancelled');
      });
  }

  get isFull(): boolean {
    return !!this.activity && this.activity.registeredCount >= this.activity.maxCapacity;
  }

  get isCancelled(): boolean {
    return this.activity?.status === 'CANCELLED';
  }

  capacityPercent(): number {
    if (!this.activity?.maxCapacity) return 0;
    return Math.min(100, Math.round((this.activity.registeredCount / this.activity.maxCapacity) * 100));
  }

  capacityClass(): string {
    const pct = this.capacityPercent();
    if (pct >= 90) return 'bg-red-400';
    if (pct >= 60) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  statusClass(status: string): string {
    const m: Record<string, string> = {
      PUBLISHED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  registrationStatusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      RECORDED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/patient/activities']);
  }
}
