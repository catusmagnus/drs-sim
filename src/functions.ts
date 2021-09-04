// Exports:
export const sleep = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export const rank = (up: number, down: number, time: number, phantom: number = 5) => {
  const a = Date.now() - time 
  return (up + down + phantom * ((a + 1) ** (-1))) / (phantom + a)
}

export const clearLastLines = (count: number) => {
  process.stdout.moveCursor(0, -count)
  process.stdout.clearScreenDown()
}
