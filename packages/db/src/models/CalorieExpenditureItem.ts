import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class CalorieExpenditureItem extends Model {
  static table = TABLES.calorie_expenditure_items;

  @text('userId') userId!: string;
  @text('date') dateYmd!: string;
  @text('name') name!: string;
  @text('description') description?: string;
  @field('calories') calories!: number;
  @field('lastUpdated') lastUpdated!: number;
  @date('updated_at') updatedAt!: Date;
}


