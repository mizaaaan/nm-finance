// Site-owner switches, read from environment variables.

// "Reset all data" is destructive and irreversible, so it is OFF unless the
// site owner explicitly sets ENABLE_DATA_RESET=true.
export const resetEnabled = () => process.env.ENABLE_DATA_RESET === 'true'
