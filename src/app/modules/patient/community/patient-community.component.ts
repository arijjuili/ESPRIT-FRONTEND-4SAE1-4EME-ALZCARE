import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-community',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-community.component.html',
  styleUrls: ['./patient-community.component.scss']
})
export class PatientCommunityComponent {
  posts = [
    {
      author: 'Margaret Wilson',
      avatar: '👩‍🦱',
      time: '2 hours ago',
      content: 'Just completed my morning walk! Feeling great today. Who else is staying active? 🏃‍♀️',
      likes: 34,
      comments: 8
    },
    {
      author: 'James Cohen',
      avatar: '👨‍🦳',
      time: '4 hours ago',
      content: 'The memory games really help. I\'ve been playing for a week now and noticed improvement. Highly recommend!',
      likes: 128,
      comments: 22
    },
    {
      author: 'Sarah Martinez',
      avatar: '👩‍🦱',
      time: '6 hours ago',
      content: 'Reminder: don\'t forget to take your medications on time. Set a reminder on your phone! 💊',
      likes: 67,
      comments: 15
    }
  ];
}
