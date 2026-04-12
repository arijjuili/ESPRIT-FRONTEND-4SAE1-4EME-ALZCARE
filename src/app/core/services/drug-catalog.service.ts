import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DrugSuggestionDTO } from '../models/drug-catalog.model';

@Injectable({ providedIn: 'root' })
export class DrugCatalogService {
  private apiBaseUrl = `${environment.apiUrl}/v1`;

  constructor(private http: HttpClient) {}

  search(q: string, limit: number = 20): Observable<DrugSuggestionDTO[]> {
    const params = new HttpParams()
      .set('q', q)
      .set('limit', limit.toString());

    return this.http
      .get<DrugSuggestionDTO[]>(`${this.apiBaseUrl}/drug-catalog/search`, { params })
      .pipe(
        catchError(error => { throw error; })
      );
  }
}
