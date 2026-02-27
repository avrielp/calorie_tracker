import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class CalorieExpenditureItem extends Model {
  static table = TABLES.calorie_expenditure_items;

  @text('userId') declare userId: string;
  @text('date') declare dateYmd: string;
  @text('name') declare name: string;
  @text('description') declare description?: string;
  @field('calories') declare calories: number;
  @field('lastUpdated') declare lastUpdated: number;
  @date('updated_at') declare updatedAt: Date;
}


