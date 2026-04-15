import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardOverview } from '../../core/services';

declare var L: any;

@Component({
  selector: 'app-weather-prayer-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="weather-prayer-card">
      <div class="glass-container">
        <!-- Weather Section -->
        <div class="weather-section" *ngIf="overview">
          <div class="weather-main">
            <span class="weather-icon" [ngSwitch]="overview.weather.condition">
              <span *ngSwitchCase="'Clear sky'">☀️</span>
              <span *ngSwitchCase="'Partly cloudy'">⛅</span>
              <span *ngSwitchCase="'Rainy'">🌧️</span>
              <span *ngSwitchCase="'Rain showers'">🌦️</span>
              <span *ngSwitchCase="'Thunderstorm'">⛈️</span>
              <span *ngSwitchCase="'Snowy'">❄️</span>
              <span *ngDefault>☁️</span>
            </span>
            <div class="temp-container">
              <span class="temp">{{ overview.weather.temperature }}°C</span>
              <span class="condition">{{ overview.weather.condition }}</span>
            </div>
          </div>
          
          <div class="weather-details">
            <div class="detail-item">
              <span class="label">Wind</span>
              <span class="value">{{ overview.weather.windSpeed }} km/h</span>
            </div>
            <div class="detail-item">
              <span class="label">Humidity</span>
              <span class="value">{{ overview.weather.humidity }}%</span>
            </div>
          </div>
        </div>

        <!-- Map Section -->
        <div class="map-wrapper">
          <div id="dashboard-map" class="map-container"></div>
          <div class="map-overlay" *ngIf="!locationFound">
            <span class="loading-text">Locating you...</span>
          </div>
          <div class="location-badge" *ngIf="locationFound">
            📍 Current Status
          </div>
        </div>

        <div class="divider"></div>

        <!-- Prayer Section -->
        <div class="prayer-section" *ngIf="overview">
          <div class="next-prayer">
            <span class="prayer-icon">🕌</span>
            <div class="prayer-info">
              <span class="label">Next Prayer</span>
              <span class="prayer-name">{{ overview.closestPrayer }}</span>
            </div>
            <span class="prayer-time">{{ overview.nextPrayerTime }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .weather-prayer-card {
      width: 100%;
      margin-top: 1rem;
      border-radius: 24px;
      overflow: hidden;
      background: linear-gradient(135deg, #0f172a, #1a365d);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 1px;
    }

    .glass-container {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      padding: 1.5rem;
      border-radius: 23px;
      color: white;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .weather-section { display: flex; justify-content: space-between; align-items: center; }
    .weather-main { display: flex; align-items: center; gap: 1rem; }
    .weather-icon { font-size: 2.5rem; filter: drop-shadow(0 0 8px rgba(255,255,255,0.3)); }
    .temp { font-size: 2rem; font-weight: 800; }
    .condition { font-size: 0.8rem; opacity: 0.8; }
    .weather-details { display: flex; flex-direction: column; gap: 0.25rem; text-align: right; }
    .detail-item .label { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; }
    .detail-item .value { font-size: 0.8rem; font-weight: 600; }

    .map-wrapper {
      position: relative;
      height: 140px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .map-container { height: 100%; width: 100%; }
    .location-badge {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      background: rgba(255,255,255,0.9); color: #1e3a8a;
      padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 700;
    }

    .divider { height: 1px; background: rgba(255,255,255,0.1); }
    .next-prayer {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255, 255, 255, 0.08); padding: 0.75rem 1rem; border-radius: 16px;
    }
    .prayer-info { display: flex; flex-direction: column; flex-grow: 1; }
    .prayer-info .label { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; }
    .prayer-name { font-weight: 700; font-size: 1rem; }
    .prayer-time { font-size: 1.15rem; font-weight: 800; color: #fbbf24; }
  `]
})
export class WeatherPrayerCardComponent implements OnInit, AfterViewInit, OnDestroy {
  overview?: DashboardOverview;
  private map: any;
  locationFound = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getOverview().subscribe((data: DashboardOverview) => {
      this.overview = data;
      this.updateMapContext();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('dashboard-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([36.8065, 10.1815], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          this.updateMarker(lat, lon);
          this.locationFound = true;
        },
        () => {
          if (this.overview) this.updateMapContext();
        }
      );
    }
  }

  private updateMarker(lat: number, lon: number): void {
    if (!this.map) return;
    this.map.setView([lat, lon], 14);
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
  }

  private updateMapContext(): void {
    if (this.overview && this.map && !this.locationFound) {
      this.map.setView([36.8, 10.1], 12);
    }
  }
}
