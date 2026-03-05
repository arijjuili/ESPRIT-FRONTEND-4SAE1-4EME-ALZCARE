/**
 * Drug Catalog Models
 * 
 * Models for the openFDA drug catalog autocomplete feature
 */

export interface DrugSuggestionDTO {
  /** Display name for the dropdown (e.g., "Paracetamol 500mg Tablet") */
  displayName: string;
  
  /** Generic name of the drug */
  genericName: string;
  
  /** Brand name (if available) */
  brandName: string;
  
  /** Dosage form (e.g., "TABLET", "CAPSULE", "INJECTION") */
  dosageForm: string;
  
  /** Route of administration (e.g., "ORAL", "INTRAVENOUS") */
  route: string;
  
  /** FDA Product NDC (National Drug Code) - unique identifier */
  productNdc: string;
}

export interface DrugCatalogSearchParams {
  /** Search query string */
  q: string;
  
  /** Maximum number of results (default: 20) */
  limit?: number;
}
