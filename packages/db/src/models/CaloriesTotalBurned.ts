import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class CaloriesTotalBurned extends Model {
  static table = TABLES.calories_total_burned;

  @text('userId') userId!: string;
  @text('date') dateYmd!: string;
  @field('total_calories') totalCalories!: number;
  @field('lastUpdated') lastUpdated!: number;
  @date('updated_at') updatedAt!: Date;
}


