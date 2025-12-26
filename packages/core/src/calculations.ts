export function caloriesBurned(restingCalories: number, activeCalories: number): number {
  return (restingCalories || 0) + (activeCalories || 0);
}

export function caloriesExpenditureSum(items: Array<{ calories: number }>): number {
  return items.reduce((sum, item) => sum + (item.calories || 0), 0);
}

export function surplusDeficit(args: { caloriesBurned: number; caloriesIntake: number }): number {
  // Positive => surplus; Negative => deficit
  return (args.caloriesIntake || 0) - (args.caloriesBurned || 0);
}

export function goalTotalCalories(target: number, bonusAllowance?: number): number {
  return (target || 0) - (bonusAllowance || 0);
}


