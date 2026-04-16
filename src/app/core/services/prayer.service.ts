import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PrayerTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunrise: string;
  Sunset: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrayerService {
  private baseUrl = `${environment.apiUrl}/v1/daily-care/prayer`;

  constructor(private http: HttpClient) {}

  getTimings(city: string = 'Tunis', country: string = 'Tunisia'): Observable<PrayerTimings> {
    return this.http.get<PrayerTimings>(`${this.baseUrl}/timings`, {
      params: { city, country }
    });
  }
}
