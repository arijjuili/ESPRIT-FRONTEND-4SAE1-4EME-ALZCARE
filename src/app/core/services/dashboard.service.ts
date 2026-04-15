import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
  isRaining: boolean;
}

export interface DashboardOverview {
  weather: WeatherData;
  prayerTimings: Record<string, string>;
  closestPrayer: string;
  nextPrayerTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = `${environment.apiUrl}/v1/daily-care/dashboard`;

  constructor(private http: HttpClient) {}

  getOverview(lat: number = 36.8, lon: number = 10.1): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.baseUrl}/overview`, {
      params: { lat: lat.toString(), lon: lon.toString() }
    });
  }
}
