export const TABLES = {
  calories_total_burned: 'calories_total_burned',
  ios_health_tracker: 'ios_health_tracker',
  calorie_expenditure_items: 'calorie_expenditure_items',
  goals: 'goals',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];


