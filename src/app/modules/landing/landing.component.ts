import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white">
      <!-- Navigation -->
      <nav class="bg-white border-b border-primary-100 shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">♥</div>
              <span class="text-2xl font-bold text-primary-700">CareHub</span>
            </div>
            <a routerLink="/login" class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition font-semibold">
              Login
            </a>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white py-24 px-4">
        <div class="max-w-4xl mx-auto text-center">
          <div class="mb-6 inline-block">
            <span class="bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold">Compassionate Care Platform</span>
          </div>
          <h1 class="text-5xl md:text-6xl font-bold mb-6">Alzheimer Care, Simplified</h1>
          <p class="text-xl text-primary-100 mb-10 leading-relaxed">
            A unified platform connecting patients, caregivers, doctors, and administrators 
            for better cognitive health outcomes and quality of life.
          </p>
          <a routerLink="/login" class="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-bold hover:bg-primary-50 transition shadow-lg">
            Get Started Now
          </a>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-24 px-4">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">Tailored Dashboards for Every Role</h2>
            <p class="text-gray-600 text-lg max-w-2xl mx-auto">Each user role has a specialized interface designed to streamline their workflow and improve care outcomes.</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Patient Card -->
            <div class="bg-gradient-to-br from-primary-50 to-primary-100 p-8 rounded-xl shadow-md hover:shadow-xl transition border border-primary-200">
              <div class="w-14 h-14 bg-primary-500 rounded-lg flex items-center justify-center text-white text-2xl mb-4">👤</div>
              <h3 class="text-xl font-bold text-primary-900 mb-3">For Patients</h3>
              <ul class="text-primary-700 space-y-2 text-sm font-medium">
                <li>✓ Personal health dashboard</li>
                <li>✓ Appointment scheduling</li>
                <li>✓ Medication tracking</li>
                <li>✓ Activity reminders</li>
              </ul>
            </div>

            <!-- Caregiver Card -->
            <div class="bg-gradient-to-br from-success-50 to-success-100 p-8 rounded-xl shadow-md hover:shadow-xl transition border border-success-200">
              <div class="w-14 h-14 bg-success rounded-lg flex items-center justify-center text-white text-2xl mb-4">🤝</div>
              <h3 class="text-xl font-bold text-success-900 mb-3">For Caregivers</h3>
              <ul class="text-success-700 space-y-2 text-sm font-medium">
                <li>✓ Patient monitoring</li>
                <li>✓ Task management</li>
                <li>✓ Alert notifications</li>
                <li>✓ Activity logging</li>
              </ul>
            </div>

            <!-- Doctor Card -->
            <div class="bg-gradient-to-br from-info-50 to-info-100 p-8 rounded-xl shadow-md hover:shadow-xl transition border border-info-200">
              <div class="w-14 h-14 bg-info rounded-lg flex items-center justify-center text-white text-2xl mb-4">👨‍⚕️</div>
              <h3 class="text-xl font-bold text-info-900 mb-3">For Doctors</h3>
              <ul class="text-info-700 space-y-2 text-sm font-medium">
                <li>✓ Patient records</li>
                <li>✓ Prescription management</li>
                <li>✓ Medical history</li>
                <li>✓ Health monitoring</li>
              </ul>
            </div>

            <!-- Admin Card -->
            <div class="bg-gradient-to-br from-warning-50 to-warning-100 p-8 rounded-xl shadow-md hover:shadow-xl transition border border-warning-200">
              <div class="w-14 h-14 bg-warning rounded-lg flex items-center justify-center text-white text-2xl mb-4">⚙️</div>
              <h3 class="text-xl font-bold text-warning-900 mb-3">For Administrators</h3>
              <ul class="text-warning-700 space-y-2 text-sm font-medium">
                <li>✓ User management</li>
                <li>✓ System analytics</li>
                <li>✓ Access control</li>
                <li>✓ Data reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- User Roles Deep Dive -->
      <section class="bg-gray-50 py-24 px-4">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- Patient -->
            <div class="bg-white rounded-xl shadow-md p-8 border-l-4 border-primary-500">
              <div class="flex gap-4 mb-4">
                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                <h3 class="text-2xl font-bold text-gray-900 self-center">Patient Portal</h3>
              </div>
              <p class="text-gray-600 leading-relaxed">
                Patients can easily access their health information, upcoming appointments, medication schedules, and track daily activities with personalized reminders to stay engaged in their care.
              </p>
            </div>

            <!-- Caregiver -->
            <div class="bg-white rounded-xl shadow-md p-8 border-l-4 border-success">
              <div class="flex gap-4 mb-4">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🤝</div>
                <h3 class="text-2xl font-bold text-gray-900 self-center">Caregiver Dashboard</h3>
              </div>
              <p class="text-gray-600 leading-relaxed">
                Caregivers can monitor assigned patients, manage daily care tasks, log activities, and respond to health alerts in real-time for efficient and responsive care.
              </p>
            </div>

            <!-- Doctor -->
            <div class="bg-white rounded-xl shadow-md p-8 border-l-4 border-info">
              <div class="flex gap-4 mb-4">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">👨‍⚕️</div>
                <h3 class="text-2xl font-bold text-gray-900 self-center">Doctor Console</h3>
              </div>
              <p class="text-gray-600 leading-relaxed">
                Doctors can review comprehensive patient records, prescribe medications, schedule appointments, and monitor health metrics for data-driven clinical decisions.
              </p>
            </div>

            <!-- Admin -->
            <div class="bg-white rounded-xl shadow-md p-8 border-l-4 border-warning">
              <div class="flex gap-4 mb-4">
                <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">⚙️</div>
                <h3 class="text-2xl font-bold text-gray-900 self-center">Admin Control</h3>
              </div>
              <p class="text-gray-600 leading-relaxed">
                Administrators can manage users, generate system reports, configure access permissions, and oversee platform operations with full visibility and control.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Benefits Section -->
      <section class="py-24 px-4 bg-white">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-4xl font-bold text-center text-gray-900 mb-16">Why CareHub?</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="inline-block w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl mb-4">🎯</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Coordinated Care</h3>
              <p class="text-gray-600">All stakeholders work together on one unified platform for seamless care coordination.</p>
            </div>
            <div class="text-center">
              <div class="inline-block w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl mb-4">📊</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Data Insights</h3>
              <p class="text-gray-600">Real-time health metrics and analytics help healthcare providers make informed decisions.</p>
            </div>
            <div class="text-center">
              <div class="inline-block w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl mb-4">🔒</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Secure & Private</h3>
              <p class="text-gray-600">Patient data is protected with industry-standard security and privacy measures.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-20 px-4">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-4xl font-bold mb-6">Ready to Improve Care Quality?</h2>
          <p class="text-xl text-primary-100 mb-10">
            Join thousands of healthcare professionals using CareHub for better patient outcomes.
          </p>
          <a routerLink="/login" class="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-bold hover:bg-primary-50 transition shadow-lg">
            Login to Your Account
          </a>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-gray-900 text-gray-300 py-12 px-4">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 bg-primary-500 rounded text-white flex items-center justify-center text-sm font-bold">♥</div>
                <span class="font-bold text-white">CareHub</span>
              </div>
              <p class="text-gray-400 text-sm">Compassionate Alzheimer care management platform.</p>
            </div>
            <div>
              <h4 class="font-bold text-white mb-4">Features</h4>
              <ul class="space-y-2 text-sm text-gray-400">
                <li><a href="#" class="hover:text-primary-400">Patient Care</a></li>
                <li><a href="#" class="hover:text-primary-400">Doctor Tools</a></li>
                <li><a href="#" class="hover:text-primary-400">Caregiver Support</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-white mb-4">Support</h4>
              <ul class="space-y-2 text-sm text-gray-400">
                <li><a href="#" class="hover:text-primary-400">Documentation</a></li>
                <li><a href="#" class="hover:text-primary-400">Contact Support</a></li>
                <li><a href="#" class="hover:text-primary-400">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div class="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 CareHub. All rights reserved. | Made with ♥ for better Alzheimer care.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class LandingComponent {}
