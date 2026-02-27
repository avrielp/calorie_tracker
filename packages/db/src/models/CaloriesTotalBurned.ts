import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class CaloriesTotalBurned extends Model {
  static table = TABLES.calories_total_burned;

  @text('userId') declare userId: string;
  @text('date') declare dateYmd: string;
  @field('total_calories') declare totalCalories: number;
  @field('lastUpdated') declare lastUpdated: number;
  @date('updated_at') declare updatedAt: Date;
}


