// Exports:
export type TWorkingListMember = {
  currentProblemID: string
  isSolving: boolean
  pIP: string
  problemsSolved: number
  time: number
}

export type TProblemMember = {
  pIP: string,
  conclusion: boolean
}

export type TProblem = {
  content: {
    _id: string
    _v: number
    score: number
  }
  initiator: string
  members: TProblemMember[]
  time: number
}

export type TContent = {
  _id: string
  _v: number
  score: number
  time: {
    createdAt: number
    lastRanked: number
  }
  votes: {
    up: number
    down: number
  }
}

export interface IServerState {
  activeProblems: Map<string, TProblem>
  contentList: Map<string, TContent>
  isDead: boolean
  isRemovingInactiveMembers: boolean
  workingList: Map<string, TWorkingListMember>
}

export type TUpdateContent = TContent & {
  newScore: number
}

export interface IClientState {
  contentList: {
    accumulator: TContent[]
    new: TContent[]
  }
  isDead: boolean
  lastContentID: string
  pIP: string
  WL: {
    lastUpdate: number
    isMember: boolean
  }
}