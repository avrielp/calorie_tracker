import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import { TABLES } from '../constants';

export class Goal extends Model {
  static table = TABLES.goals;

  @text('userId') declare userId: string;
  @text('date') declare dateYmd: string;
  @text('name') declare name: string;
  @text('goal_type') declare goalType: string;
  @field('target') declare target: number;
  @field('bonus_allowance') declare bonusAllowance?: number;
  @field('lastUpdated') declare lastUpdated: number;
  @date('updated_at') declare updatedAt: Date;
}


