import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class Goal extends Model {
  static table = TABLES.goals;

  @text('userId') userId!: string;
  @text('date') dateYmd!: string;
  @text('name') name!: string;
  @text('goal_type') goalType!: string;
  @field('target') target!: number;
  @field('bonus_allowance') bonusAllowance?: number;
  @field('lastUpdated') lastUpdated!: number;
  @date('updated_at') updatedAt!: Date;
}


