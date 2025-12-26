import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { TABLES } from './constants';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: TABLES.calories_total_burned,
      columns: [
        { name: 'userId', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true }, // YYYY-MM-DD
        { name: 'total_calories', type: 'number' },
        { name: 'lastUpdated', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: TABLES.ios_health_tracker,
      columns: [
        { name: 'userId', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true }, // YYYY-MM-DD
        { name: 'resting_calories', type: 'number' },
        { name: 'active_calories', type: 'number' },
        { name: 'distance_walking_and_running', type: 'number' },
        { name: 'exercise_minutes', type: 'number' },
        { name: 'lastUpdated', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: TABLES.calorie_expenditure_items,
      columns: [
        { name: 'userId', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true }, // YYYY-MM-DD
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'calories', type: 'number' },
        { name: 'lastUpdated', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: TABLES.goals,
      columns: [
        { name: 'userId', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true }, // start date for the cycle or custom anchor
        { name: 'name', type: 'string' },
        { name: 'goal_type', type: 'string', isIndexed: true }, // daily|weekly|monthly|custom
        { name: 'target', type: 'number' },
        { name: 'bonus_allowance', type: 'number', isOptional: true },
        { name: 'lastUpdated', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});


