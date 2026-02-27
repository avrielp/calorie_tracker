import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class IosHealthTracker extends Model {
  static table = TABLES.ios_health_tracker;

  @text('userId') declare userId: string;
  @text('date') declare dateYmd: string;
  @field('resting_calories') declare restingCalories: number;
  @field('active_calories') declare activeCalories: number;
  @field('distance_walking_and_running') declare distanceWalkingAndRunning: number;
  @field('exercise_minutes') declare exerciseMinutes: number;
  @field('lastUpdated') declare lastUpdated: number;
  @date('updated_at') declare updatedAt: Date;
}


