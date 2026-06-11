// Order pipeline stages (knitting happens at batch level, before orders)
export const PROCESS_STAGES = ['Dyeing', 'Stentering', 'Compacting', 'Finishing']
export const COMBINED_STAGE = 'Dyeing & Stentering'

export const LOSS_LIMIT_PERCENT = 7
export const DELAY_DAYS = 2
export const NEAR_TARGET_DAYS = 3

export const ADMIN_EMAIL = 'admin@amoga.local'
