import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy, AfterViewInit {
  currentUser: AuthUser | null = null;
  mobileMenuOpen = false;
  private authSubscription: Subscription | null = null;
  private observer: IntersectionObserver | null = null;

  adminAxes = [
    'Medications', 'Appointments', 'Behaviors', 'Alerts',
    'Caregivers', 'Doctors', 'Games', 'Memory',
    'Routines', 'Patients', 'Community', 'Activities'
  ];

  benefits = [
    {
      title: 'Real-Time Alerts',
      description: 'ESP32 camera-detected behaviors trigger instant alerts. Caregivers validate incidents and log observations with photo evidence.',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    {
      title: 'Cognitive Games',
      description: '6 brain-training exercises designed to stimulate memory, attention, and problem-solving skills for patients with cognitive decline.',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary-600'
    },
    {
      title: 'Community Forum',
      description: 'Patients connect through discussion threads with categories like Advice, Support, Resources, and Success Stories.',
      icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Smart Notifications',
      description: 'Configurable notification schedules with real-time polling, toast alerts, and a full notification center with filters and search.',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Secure Authentication',
      description: 'Enterprise-grade authentication with automatic token refresh, role-based access control, and seamless silent re-authentication.',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    {
      title: 'Behavior Tracking',
      description: 'Timeline and table views for behavior incidents with severity tracking, photo evidence, validation workflows, and filtering.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    }
  ];

  milestones = [
    {
      date: 'The Beginning',
      title: 'Identifying the Problem',
      description: 'Witnessed families struggling with fragmented Alzheimer\'s care management.',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      dotClass: 'bg-primary-100',
      iconClass: 'text-primary-600'
    },
    {
      date: 'Research Phase',
      title: 'Understanding the Needs',
      description: 'Interviewed caregivers, doctors, and families to map pain points in the care journey.',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      dotClass: 'bg-blue-100',
      iconClass: 'text-blue-600'
    },
    {
      date: 'Development',
      title: 'Building ALZCARE',
      description: 'Designed a role-based platform with real-time monitoring, cognitive tools, and community support.',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      dotClass: 'bg-green-100',
      iconClass: 'text-green-600'
    },
    {
      date: 'Today',
      title: 'Delivering Care',
      description: '4 specialized dashboards, 12 care axes, real-time alerts, and a growing community.',
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      dotClass: 'bg-primary-500',
      iconClass: 'text-white'
    }
  ];

  testimonials = [
    {
      quote: 'ALZCARE has completely transformed how we coordinate care for our Alzheimer\'s patients. The real-time alerts mean we never miss a critical incident, and the behavior tracking gives us data we can actually act on.',
      name: 'Dr. Sarah Mansour',
      role: 'Neurologist',
      initials: 'SM',
      avatarClass: 'bg-blue-500',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&q=80&fit=crop&crop=faces'
    },
    {
      quote: 'As a caregiver managing multiple patients, having everything in one place is a lifesaver. I can log behaviors, upload photos, track medications, and communicate with the medical team without switching between apps.',
      name: 'Amira Ben Ali',
      role: 'Professional Caregiver',
      initials: 'AB',
      avatarClass: 'bg-green-500',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&fit=crop&crop=faces'
    },
    {
      quote: 'My father was diagnosed two years ago and it was overwhelming. ALZCARE gave our family visibility into his daily care routine and peace of mind that his caregivers and doctors are always in sync.',
      name: 'Karim Jebali',
      role: 'Family Member',
      initials: 'KJ',
      avatarClass: 'bg-primary-500',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&fit=crop&crop=faces'
    }
  ];

  contactForm = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };
  contactSubmitted = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngAfterViewInit(): void {
    this.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/landing']);
  }

  submitContact(): void {
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) return;
    this.contactSubmitted = true;
    this.contactForm = { name: '', email: '', subject: '', message: '' };
  }

  get dashboardLink(): string {
    if (!this.currentUser) return '/login';
    const role = this.currentUser.role;
    if (role === 'caregiver') return '/caregiver/dashboard';
    if (role === 'doctor') return '/doctor/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/patient/dashboard';
  }

  private setupScrollAnimations(): void {
    const elements = document.querySelectorAll('.scroll-reveal');
    if (!elements.length) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(el => this.observer!.observe(el));
  }
}
