import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrayerService, PrayerTimings } from '../../core/services';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-prayer-times',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="prayer-container bg-gradient-to-br from-emerald-900 to-teal-800 text-white p-4 rounded-none shadow-2xl border border-emerald-400/20 backdrop-blur-md">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold flex items-center gap-2">
          <span class="text-2xl">🕌</span> Prayer Schedule
        </h3>
        <span class="text-xs bg-emerald-500/30 px-2 py-1 rounded-full border border-emerald-400/30">Tunis, TN</span>
      </div>

      <div class="grid grid-cols-5 gap-2">
        @for (prayer of prayerList; track prayer.name) {
          <div [class.active-prayer]="prayer.isActive" 
               class="flex flex-col items-center p-2 rounded-xl transition-all duration-300 group relative">
            <span class="text-[10px] uppercase opacity-70 group-hover:opacity-100">{{ prayer.name }}</span>
            <span class="text-sm font-semibold">{{ prayer.time }}</span>
            @if (prayer.isActive) {
              <div class="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full animate-ping"></div>
            }
          </div>
        }
      </div>

      @if (nextPrayer) {
        <div class="mt-4 pt-3 border-t border-emerald-400/20 text-center">
          <p class="text-[11px] opacity-80">Next: <span class="font-bold text-emerald-300">{{ nextPrayer.name }}</span> at {{ nextPrayer.time }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; margin-bottom: 1.5rem; }
    .prayer-container { transition: transform 0.3s ease; }
    .prayer-container:hover { transform: translateY(-2px); }
    .active-prayer { 
      background: rgba(52, 211, 153, 0.2); 
      border: 1px solid rgba(52, 211, 153, 0.4);
      transform: scale(1.05);
    }
  `]
})
export class PrayerTimesComponent implements OnInit, OnDestroy {
  timings?: PrayerTimings;
  prayerList: { name: string; time: string; isActive: boolean }[] = [];
  nextPrayer?: { name: string; time: string };
  private checkSubscription?: Subscription;
  private adhanAudio = new Audio('https://www.islamcan.com/adhan/makkah.mp3');

  constructor(private prayerService: PrayerService) {}

  ngOnInit(): void {
    this.prayerService.getTimings().subscribe((t: PrayerTimings) => {
      this.timings = t;
      this.updatePrayerList();
      this.startTimeCheck();
    });
  }

  ngOnDestroy(): void {
    this.checkSubscription?.unsubscribe();
  }

  private updatePrayerList() {
    if (!this.timings) return;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    this.prayerList = [
      { name: 'Fajr', time: this.timings.Fajr, isActive: false },
      { name: 'Dhuhr', time: this.timings.Dhuhr, isActive: false },
      { name: 'Asr', time: this.timings.Asr, isActive: false },
      { name: 'Maghrib', time: this.timings.Maghrib, isActive: false },
      { name: 'Isha', time: this.timings.Isha, isActive: false }
    ];

    // Find active and next prayer
    let foundActive = false;
    for (let i = 0; i < this.prayerList.length; i++) {
        const pTime = this.prayerList[i].time;
        if (!foundActive && currentTime >= pTime && (i === this.prayerList.length - 1 || currentTime < this.prayerList[i+1].time)) {
            this.prayerList[i].isActive = true;
            foundActive = true;
        }
    }
    
    this.nextPrayer = this.prayerList.find(p => p.time > currentTime) || this.prayerList[0];
  }

  private startTimeCheck() {
    this.checkSubscription = interval(60000).subscribe(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      this.updatePrayerList();

      // Check if it's exact prayer time to play Adhan
      const currentPrayer = this.prayerList.find(p => p.time === currentTime);
      if (currentPrayer) {
        this.playAdhan();
        this.showNotification(currentPrayer.name);
      }
    });
  }

  private playAdhan() {
    this.adhanAudio.play().catch(e => console.error('Audio play failed:', e));
  }

  private showNotification(prayerName: string) {
    if (Notification.permission === 'granted') {
      new Notification('Time for Prayer', {
        body: `It is time for ${prayerName}. Take a moment for spiritual peace.`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913451.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}
