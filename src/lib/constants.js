// Process stages in order
export const STAGES = ['Yarn Received', 'Knitting', 'Dyeing', 'Compacting', 'Stentering', 'Finishing', 'Fabric Inhouse']
export const PROCESS_STAGES = ['Knitting', 'Dyeing', 'Compacting', 'Stentering', 'Finishing']

// Thresholds for traffic-light status
export const LOSS_LIMIT_PERCENT = 7   // above this → RED
export const DELAY_DAYS = 2           // stuck at a process for this many days → YELLOW
export const NEAR_TARGET_DAYS = 3     // within this many days of target → YELLOW
