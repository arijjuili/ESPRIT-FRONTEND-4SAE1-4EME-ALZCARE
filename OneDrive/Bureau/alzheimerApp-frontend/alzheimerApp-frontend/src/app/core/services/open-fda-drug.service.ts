import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { DrugSuggestionDTO } from '../models/drug-catalog.model';

/**
 * OpenFDA Drug Service
 * 
 * Service for searching drugs directly from the openFDA API (Drug NDC endpoint).
 * No backend proxy - calls https://api.fda.gov/drug/ndc.json directly.
 * 
 * @see https://open.fda.gov/apis/drug/ndc/
 */
@Injectable({ providedIn: 'root' })
export class OpenFdaDrugService {
  private readonly API_BASE_URL = 'https://api.fda.gov/drug/ndc.json';

  constructor(private http: HttpClient) {}

  /**
   * Search for drugs in the openFDA catalog
   * Searches both brand_name and generic_name with wildcards
   * 
   * @param query Search query (at least 3 characters recommended)
   * @param limit Maximum number of results (default: 20, max: 100)
   * @returns Observable of deduplicated drug suggestions
   */
  search(query: string, limit: number = 20): Observable<DrugSuggestionDTO[]> {
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return of([]);
    }

    // Build search query using openFDA syntax
    // Search in generic_name field with wildcard (most reliable field)
    const searchQuery = `generic_name:${trimmedQuery}*`;

    const params = new HttpParams()
      .set('search', searchQuery)
      .set('limit', limit.toString());

    return this.http
      .get<OpenFdaResponse>(this.API_BASE_URL, { params })
      .pipe(
        map(response => this.mapResponseToDTOs(response)),
        catchError(error => {
          // Handle CORS, 403, network errors gracefully
          console.error('OpenFDA API error:', error);
          return of([]);
        })
      );
  }

  /**
   * Map openFDA API response to our DrugSuggestionDTO format
   * Normalizes and deduplicates results
   */
  private mapResponseToDTOs(response: OpenFdaResponse): DrugSuggestionDTO[] {
    if (!response?.results || !Array.isArray(response.results) || response.results.length === 0) {
      console.log('[OpenFDA] No results in response:', response);
      return [];
    }

    console.log('[OpenFDA] Mapping', response.results.length, 'results');
    const suggestions: DrugSuggestionDTO[] = [];
    const seenKeys = new Set<string>();

    for (const result of response.results) {
      // Try to get data from root level first, then from openfda object
      const genericName = result.generic_name || '';
      const brandName = result.brand_name || '';
      const dosageForm = Array.isArray(result.dosage_form) ? result.dosage_form[0] : (result.dosage_form || '');
      const route = Array.isArray(result.route) ? result.route[0] : (result.route || '');
      const productNdc = result.product_ndc || '';

      // Also check openfda object if root fields are empty
      const openFda = result.openfda;
      const finalGenericName = genericName || (openFda?.generic_name?.[0]) || '';
      const finalBrandName = brandName || (openFda?.brand_name?.[0]) || '';
      const finalDosageForm = dosageForm;
      const finalRoute = route || (openFda?.route?.[0]) || '';

      const normalizedGeneric = this.normalizeString(finalGenericName);
      const normalizedBrand = this.normalizeString(finalBrandName);
      
      // Skip if no name available
      if (!normalizedGeneric && !normalizedBrand) continue;

      // Filter out combination drugs (more than 2 active ingredients)
      const ingredientCount = normalizedGeneric.split(',').length;
      if (ingredientCount > 2) continue;

      const normalizedDosageForm = this.normalizeString(finalDosageForm);
      const normalizedRoute = this.normalizeString(finalRoute);

      // Create deduplication key
      const dedupKey = `${normalizedBrand}|${normalizedGeneric}|${normalizedDosageForm}|${normalizedRoute}`;
      
      // Skip duplicates
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);

      // Build display name
      let displayName: string;
      if (normalizedBrand && normalizedGeneric) {
        displayName = `${normalizedBrand} — ${normalizedGeneric}`;
      } else if (normalizedBrand) {
        displayName = normalizedBrand;
      } else {
        displayName = normalizedGeneric;
      }

      suggestions.push({
        displayName,
        genericName: normalizedGeneric,
        brandName: normalizedBrand,
        dosageForm: normalizedDosageForm,
        route: normalizedRoute,
        productNdc
      });
    }

    console.log('[OpenFDA] Mapped', suggestions.length, 'suggestions');
    return suggestions;
  }

  /**
   * Normalize a string: trim, uppercase, remove extra spaces
   */
  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }
}

/**
 * OpenFDA API Response Structure
 * Based on https://api.fda.gov/drug/ndc.json schema
 */
interface OpenFdaResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: OpenFdaDrugResult[];
}

/**
 * Individual drug result from openFDA NDC API
 * Fields can be at root level or inside openfda object
 */
interface OpenFdaDrugResult {
  product_ndc?: string;
  generic_name?: string;
  brand_name?: string;
  labeler_name?: string;
  dosage_form?: string[] | string;
  route?: string[] | string;
  marketing_category?: string;
  application_number?: string;
  product_type?: string;
  active_ingredients?: Array<{
    name: string;
    strength: string;
  }>;
  openfda?: {
    manufacturer_name?: string[];
    rxcui?: string[];
    spl_set_id?: string[];
    is_original_packager?: boolean[];
    brand_name?: string[];
    generic_name?: string[];
    route?: string[];
    product_type?: string[];
    substance_name?: string[];
    spl_id?: string[];
    product_ndc?: string[];
    package_ndc?: string[];
    nui?: string[];
    pharm_class_moa?: string[];
    pharm_class_cs?: string[];
    pharm_class_epc?: string[];
    upc?: string[];
    unii?: string[];
  };
}
