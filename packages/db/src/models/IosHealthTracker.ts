import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class IosHealthTracker extends Model {
  static table = TABLES.ios_health_tracker;

  @text('userId') userId!: string;
  @text('date') dateYmd!: string;
  @field('resting_calories') restingCalories!: number;
  @field('active_calories') activeCalories!: number;
  @field('distance_walking_and_running') distanceWalkingAndRunning!: number;
  @field('exercise_minutes') exerciseMinutes!: number;
  @field('lastUpdated') lastUpdated!: number;
  @date('updated_at') updatedAt!: Date;
}


