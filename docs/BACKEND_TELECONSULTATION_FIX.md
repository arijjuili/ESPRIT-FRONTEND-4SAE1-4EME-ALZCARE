# Backend Fix - Teleconsultation Meeting URL

> Ce document décrit les modifications nécessaires dans le **medical-followup-ms** pour gérer correctement les URLs de téléconsultation.

---

## 🎯 Problème

Quand un docteur confirme un rendez-vous ONLINE :
1. Le backend ne génère pas de `meetingUrl`
2. Le patient et le docteur n'ont pas de lien pour rejoindre la téléconsultation
3. L'endpoint `/teleconsultation/link` retourne 404

## ✅ Solution

Générer automatiquement un `meetingUrl` quand un rendez-vous ONLINE est CONFIRMÉ.

---

## 1. Entity Appointment (Ajout du champ meetingUrl)

**Fichier:** `src/main/java/com/alzcare/medicalfollowup/entity/Appointment.java`

```java
@Entity
@Table(name = "appointments")
public class Appointment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String patientId;
    private Long doctorId;
    private Long caregiverId;
    
    @Enumerated(EnumType.STRING)
    private AppointmentType type;
    
    @Enumerated(EnumType.STRING)
    private AppointmentPriority priority;
    
    @Enumerated(EnumType.STRING)
    private AppointmentMode mode;
    
    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;
    
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    
    // 🆕 NOUVEAU CHAMP - URL de téléconsultation
    @Column(name = "meeting_url", length = 500)
    private String meetingUrl;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // PrePersist - Générer meetingUrl automatiquement
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // 🆕 Générer l'URL Jitsi si le RDV est ONLINE, CONFIRMED et n'a pas encore d'URL
        if (this.mode == AppointmentMode.ONLINE && 
            this.status == AppointmentStatus.CONFIRMED && 
            (this.meetingUrl == null || this.meetingUrl.isEmpty())) {
            this.meetingUrl = generateJitsiUrl();
        }
    }
    
    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        // 🆕 Générer l'URL si on crée directement un RDV CONFIRMED
        if (this.mode == AppointmentMode.ONLINE && 
            this.status == AppointmentStatus.CONFIRMED && 
            (this.meetingUrl == null || this.meetingUrl.isEmpty())) {
            this.meetingUrl = generateJitsiUrl();
        }
    }
    
    // 🆕 Méthode pour générer l'URL Jitsi
    private String generateJitsiUrl() {
        // Format: https://meet.jit.si/alzcare-appointment-{id}
        // L'ID sera disponible après le premier persist, donc on utilise une méthode différente
        return null; // Sera généré après persist via le service
    }
    
    // Getters et Setters
    // ... (getters/setters existants)
    
    public String getMeetingUrl() {
        return meetingUrl;
    }
    
    public void setMeetingUrl(String meetingUrl) {
        this.meetingUrl = meetingUrl;
    }
}
```

---

## 2. DTO - AppointmentResponse

**Fichier:** `src/main/java/com/alzcare/medicalfollowup/dto/AppointmentResponse.java`

```java
public class AppointmentResponse {
    private Long id;
    private String patientId;
    private Long doctorId;
    private Long caregiverId;
    private AppointmentType type;
    private AppointmentPriority priority;
    private AppointmentMode mode;
    private AppointmentStatus status;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String meetingUrl;  // 🆕 AJOUTER CE CHAMP
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 🆕 Constructeur depuis Entity
    public static AppointmentResponse fromEntity(Appointment appointment) {
        AppointmentResponse dto = new AppointmentResponse();
        dto.setId(appointment.getId());
        dto.setPatientId(appointment.getPatientId());
        dto.setDoctorId(appointment.getDoctorId());
        dto.setCaregiverId(appointment.getCaregiverId());
        dto.setType(appointment.getType());
        dto.setPriority(appointment.getPriority());
        dto.setMode(appointment.getMode());
        dto.setStatus(appointment.getStatus());
        dto.setStartAt(appointment.getStartAt());
        dto.setEndAt(appointment.getEndAt());
        dto.setMeetingUrl(appointment.getMeetingUrl());  // 🆕 IMPORTANT
        dto.setCreatedAt(appointment.getCreatedAt());
        dto.setUpdatedAt(appointment.getUpdatedAt());
        return dto;
    }
    
    // Getters et Setters
    // ...
}
```

---

## 3. Service - AppointmentService

**Fichier:** `src/main/java/com/alzcare/medicalfollowup/service/AppointmentService.java`

```java
@Service
@Transactional
public class AppointmentService {
    
    @Autowired
    private AppointmentRepository appointmentRepository;
    
    /**
     * 🆕 Changer le statut d'un rendez-vous
     * Génère automatiquement le meetingUrl si ONLINE et CONFIRMED
     */
    public AppointmentResponse changeStatus(Long appointmentId, AppointmentStatus newStatus) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));
        
        // Mettre à jour le statut
        appointment.setStatus(newStatus);
        
        // 🆕 Générer l'URL de téléconsultation si nécessaire
        if (newStatus == AppointmentStatus.CONFIRMED && 
            appointment.getMode() == AppointmentMode.ONLINE &&
            (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isEmpty())) {
            
            String jitsiUrl = generateJitsiUrl(appointment.getId());
            appointment.setMeetingUrl(jitsiUrl);
            System.out.println("[AppointmentService] Generated Jitsi URL for appointment " + appointmentId + ": " + jitsiUrl);
        }
        
        // Sauvegarder
        Appointment saved = appointmentRepository.save(appointment);
        
        return AppointmentResponse.fromEntity(saved);
    }
    
    /**
     * 🆕 Générer une URL Jitsi unique
     */
    private String generateJitsiUrl(Long appointmentId) {
        // Format: https://meet.jit.si/alzcare-appointment-{id}-{random}
        // Le random évite les conflits si besoin
        return "https://meet.jit.si/alzcare-appointment-" + appointmentId;
    }
    
    /**
     * 🆕 Récupérer un rendez-vous par ID (avec meetingUrl)
     */
    public AppointmentResponse getAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        
        return AppointmentResponse.fromEntity(appointment);
    }
    
    /**
     * 🆕 Lister les rendez-vous d'un patient (avec meetingUrl)
     */
    public List<AppointmentResponse> listAppointments(String patientId, LocalDateTime from, LocalDateTime to) {
        List<Appointment> appointments = appointmentRepository.findByPatientIdAndStartAtBetween(patientId, from, to);
        
        return appointments.stream()
            .map(AppointmentResponse::fromEntity)
            .collect(Collectors.toList());
    }
    
    // Autres méthodes...
}
```

---

## 4. Controller - AppointmentController

**Fichier:** `src/main/java/com/alzcare/medicalfollowup/controller/AppointmentController.java`

```java
@RestController
@RequestMapping("/api/v1/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {
    
    @Autowired
    private AppointmentService appointmentService;
    
    /**
     * 🆕 PATCH /appointments/{id}/status
     * Change le statut et génère le meetingUrl si CONFIRMED + ONLINE
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> changeStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status) {
        
        System.out.println("[AppointmentController] Changing status of appointment " + id + " to " + status);
        
        AppointmentResponse updated = appointmentService.changeStatus(id, status);
        
        System.out.println("[AppointmentController] Response - meetingUrl: " + updated.getMeetingUrl());
        
        return ResponseEntity.ok(updated);
    }
    
    /**
     * 🆕 GET /appointments/{id}
     * Retourne l'appointment avec le meetingUrl
     */
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointment(@PathVariable Long id) {
        AppointmentResponse appointment = appointmentService.getAppointment(id);
        return ResponseEntity.ok(appointment);
    }
    
    /**
     * 🆕 GET /appointments
     * Liste avec meetingUrl
     */
    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> listAppointments(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String caregiverId,
            @RequestParam String from,
            @RequestParam String to) {
        
        // Convertir les dates...
        LocalDateTime fromDate = LocalDateTime.parse(from);
        LocalDateTime toDate = LocalDateTime.parse(to);
        
        List<AppointmentResponse> appointments;
        if (patientId != null) {
            appointments = appointmentService.listAppointments(patientId, fromDate, toDate);
        } else {
            // Autres filtres...
            appointments = appointmentService.listAll(fromDate, toDate);
        }
        
        return ResponseEntity.ok(appointments);
    }
    
    // 🆕 Endpoint optionnel pour récupérer le lien de téléconsultation
    @GetMapping("/{id}/teleconsultation/link")
    public ResponseEntity<TeleconsultationLinkResponse> getTeleconsultationLink(
            @PathVariable Long id,
            @RequestParam String userId) {
        
        AppointmentResponse appointment = appointmentService.getAppointment(id);
        
        // Vérifier que l'utilisateur a le droit de voir ce lien
        // (patient ou doctor du RDV)
        boolean hasAccess = appointment.getPatientId().equals(userId) || 
                           appointment.getDoctorId().toString().equals(userId);
        
        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }
        
        // Si pas encore d'URL et que le RDV est confirmé, en générer une
        String meetingUrl = appointment.getMeetingUrl();
        if (meetingUrl == null && appointment.getStatus() == AppointmentStatus.CONFIRMED) {
            meetingUrl = appointmentService.generateAndSaveMeetingUrl(id);
        }
        
        TeleconsultationLinkResponse response = new TeleconsultationLinkResponse(
            id,
            meetingUrl,
            meetingUrl != null
        );
        
        return ResponseEntity.ok(response);
    }
}
```

---

## 5. DTO - TeleconsultationLinkResponse

**Fichier:** `src/main/java/com/alzcare/medicalfollowup/dto/TeleconsultationLinkResponse.java`

```java
public class TeleconsultationLinkResponse {
    private Long appointmentId;
    private String meetingLink;  // Frontend attend "meetingLink" ou "meetingUrl"
    private boolean active;
    
    public TeleconsultationLinkResponse(Long appointmentId, String meetingLink, boolean active) {
        this.appointmentId = appointmentId;
        this.meetingLink = meetingLink;
        this.active = active;
    }
    
    // Getters et Setters
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    
    public String getMeetingLink() { return meetingLink; }
    public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
    
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
```

---

## 6. Migration SQL

**Fichier:** `src/main/resources/db/migration/V2__add_meeting_url.sql`

```sql
-- Ajouter la colonne meeting_url à la table appointments
ALTER TABLE appointments 
ADD COLUMN meeting_url VARCHAR(500);

-- Index pour recherche rapide
CREATE INDEX idx_appointments_meeting_url ON appointments(meeting_url);
```

---

## 7. Flow Complet

### Scénario: Docteur confirme un rendez-vous ONLINE

```
1. Docteur clique "Confirm"
   ↓
2. Frontend: PATCH /appointments/5/status?status=CONFIRMED
   ↓
3. Backend: 
   - Change status à CONFIRMED
   - Vérifie mode == ONLINE
   - Génère: https://meet.jit.si/alzcare-appointment-5
   - Sauvegarde en DB
   - Retourne AppointmentResponse avec meetingUrl
   ↓
4. Frontend (Doctor): Affiche le lien "Join Meeting"
   ↓
5. Patient recharge sa liste:
   GET /appointments?patientId=xxx
   ↓
6. Backend: Retourne l'appointment avec le même meetingUrl
   ↓
7. Frontend (Patient): Affiche le même lien "Join Meeting"
   ↓
8. Patient et Docteur cliquent → Même salle Jitsi !
```

---

## 8. Tests avec curl

### Confirmer un rendez-vous (génère le meetingUrl)
```bash
curl -X PATCH "http://localhost:8080/api/v1/appointments/5/status?status=CONFIRMED" \
  -H "Authorization: Bearer $TOKEN"
```

**Réponse attendue:**
```json
{
  "id": 5,
  "status": "CONFIRMED",
  "mode": "ONLINE",
  "meetingUrl": "https://meet.jit.si/alzcare-appointment-5",
  ...
}
```

### Récupérer un rendez-vous (avec meetingUrl)
```bash
curl "http://localhost:8080/api/v1/appointments/5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Important

1. **Les URLs Jitsi sont publiques** - Toute personne avec l'URL peut rejoindre
2. **Format de l'URL** - Doit être identique côté patient et docteur
3. **Persistance** - L'URL doit être sauvegardée en DB pour être récupérée plus tard

---

Tu veux que je modifie autre chose ou que j'explique une partie en détail ?
