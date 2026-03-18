import { Injectable } from '@angular/core';
import { Patient, Appointment, CareTask, HealthMetric } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  
  private mockPatients: Patient[] = [
    {
      id: 'p1',
      name: 'Margaret Johnson',
      dateOfBirth: new Date('1945-06-15'),
      email: 'margaret.j@example.com',
      phone: '+1-555-0101',
      condition: 'Alzheimer\'s Disease (Stage 2)',
      medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
      currentMedications: [
        { id: 'm1', name: 'Donepezil', dosage: '10mg', frequency: 'Daily', prescribedBy: 'Dr. Michael' },
        { id: 'm2', name: 'Memantine', dosage: '20mg', frequency: 'Daily', prescribedBy: 'Dr. Michael' },
        { id: 'm3', name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', prescribedBy: 'Dr. Michael' }
      ],
      emergencyContact: 'Sarah Johnson (Daughter) - +1-555-0102'
    },
    {
      id: 'p2',
      name: 'Robert Williams',
      dateOfBirth: new Date('1940-03-22'),
      email: 'robert.w@example.com',
      phone: '+1-555-0103',
      condition: 'Mild Cognitive Impairment',
      medicalHistory: ['Hypertension', 'Asthma'],
      currentMedications: [
        { id: 'm4', name: 'Aricept', dosage: '5mg', frequency: 'Daily', prescribedBy: 'Dr. Michael' },
        { id: 'm5', name: 'Atenolol', dosage: '50mg', frequency: 'Daily', prescribedBy: 'Dr. Michael' }
      ],
      emergencyContact: 'James Williams (Son) - +1-555-0104'
    }
  ];

  private mockAppointments: Appointment[] = [
    {
      id: 'a1',
      patientId: 'p1',
      doctorId: '3',
      date: new Date(new Date().setDate(new Date().getDate() + 3)),
      type: 'Cognitive Assessment',
      notes: 'Monthly cognitive evaluation',
      status: 'scheduled'
    },
    {
      id: 'a2',
      patientId: 'p1',
      doctorId: '3',
      date: new Date(new Date().setDate(new Date().getDate() - 5)),
      type: 'Follow-up',
      notes: 'Medication review',
      status: 'completed'
    },
    {
      id: 'a3',
      patientId: 'p2',
      doctorId: '3',
      date: new Date(new Date().setDate(new Date().getDate() + 7)),
      type: 'Check-up',
      notes: 'Routine check-up',
      status: 'scheduled'
    }
  ];

  private mockTasks: CareTask[] = [
    {
      id: 't1',
      patientId: 'p1',
      title: 'Morning Medications',
      description: 'Administer Donepezil and Memantine',
      dueDate: new Date(),
      assignedTo: '2',
      completed: true,
      priority: 'high'
    },
    {
      id: 't2',
      patientId: 'p1',
      title: 'Physical Activity',
      description: '30-minute walk in the garden',
      dueDate: new Date(),
      assignedTo: '2',
      completed: false,
      priority: 'medium'
    },
    {
      id: 't3',
      patientId: 'p1',
      title: 'Memory Exercise',
      description: 'Photo album review and memory recall',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      assignedTo: '2',
      completed: false,
      priority: 'medium'
    },
    {
      id: 't4',
      patientId: 'p2',
      title: 'Evening Medications',
      description: 'Administer Aricept',
      dueDate: new Date(),
      assignedTo: '2',
      completed: false,
      priority: 'high'
    }
  ];

  private mockHealthMetrics: HealthMetric[] = [
    {
      id: 'h1',
      patientId: 'p1',
      type: 'blood_pressure',
      value: '128/82',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 2)),
      unit: 'mmHg'
    },
    {
      id: 'h2',
      patientId: 'p1',
      type: 'heart_rate',
      value: '72',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 2)),
      unit: 'bpm'
    },
    {
      id: 'h3',
      patientId: 'p1',
      type: 'glucose',
      value: '115',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 4)),
      unit: 'mg/dL'
    },
    {
      id: 'h4',
      patientId: 'p2',
      type: 'blood_pressure',
      value: '120/78',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 1)),
      unit: 'mmHg'
    },
    {
      id: 'h5',
      patientId: 'p2',
      type: 'heart_rate',
      value: '68',
      timestamp: new Date(new Date().setHours(new Date().getHours() - 1)),
      unit: 'bpm'
    }
  ];

  getPatients(): Patient[] {
    return this.mockPatients;
  }

  getPatientById(id: string): Patient | undefined {
    return this.mockPatients.find(p => p.id === id);
  }

  getAppointments(patientId?: string): Appointment[] {
    if (patientId) {
      return this.mockAppointments.filter(a => a.patientId === patientId);
    }
    return this.mockAppointments;
  }

  getTasks(patientId?: string, assignedTo?: string): CareTask[] {
    return this.mockTasks.filter(t => {
      if (patientId && t.patientId !== patientId) return false;
      if (assignedTo && t.assignedTo !== assignedTo) return false;
      return true;
    });
  }

  getHealthMetrics(patientId: string): HealthMetric[] {
    return this.mockHealthMetrics.filter(h => h.patientId === patientId);
  }

  getTasksForCaregiver(caregiverId: string): CareTask[] {
    return this.mockTasks.filter(t => t.assignedTo === caregiverId);
  }

  updateTaskStatus(taskId: string, completed: boolean): void {
    const task = this.mockTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = completed;
    }
  }
}
