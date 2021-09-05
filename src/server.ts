// Packages:
import fs from 'fs'
import { sleep } from './functions'


// Typescript:
import Client from './client'
import { IServerState, TWorkingListMember, TContent, TUpdateContent, TProblem, TProblemMember } from './types'


// Constants:
const minimumWLLength = 10, moderateWLLength = 15, maximumWLLength = 20,
  WLMemberExpiryInterval =  6 * 6 * 1000, // 1 hour
  problemExpiryInterval = 0.2 * 6 * 1000 // 2 minutes


// Class:
class Server {
  getClientBypIP: (pIP: string) => Client
  state: IServerState = {
    activeProblems: new Map(),
    contentList: new Map(),
    isDead: false,
    isRemovingInactiveMembers: false,
    workingList: new Map()
  }
  constructor(getClientBypIP: (pIP: string) => Client) {
    this.getClientBypIP = getClientBypIP
  }
  processWLRequest = async (pIP: string): Promise<boolean> => {
    fs.appendFileSync('record.txt', `SERVER: EVALUATING ${ pIP } WLS REQUEST\n`)
    if (this.state.isDead) return false
    if (this.state.isRemovingInactiveMembers) {
      // PING: 300ms to 800ms (S) -> (C) 
      await sleep(Math.round(Math.random() * 5) + 3)
      fs.appendFileSync('record.txt', `SERVER: DENIED ${ pIP } WLS REQUEST (BUSY REMOVING INACTIVE MEMBERS)\n`)
      return false
    } if (this.state.workingList.size < minimumWLLength) {
      fs.appendFileSync('record.txt', `SERVER: WL SIZE (${ this.state.workingList.size }) < MIN LEN\n`)
      const time = Date.now()
      // PING: 200ms to 500ms (S) -> (D)
      await sleep(Math.round(Math.random() * 3) + 2)
      this.state.workingList.set(pIP, {
        currentProblemID: '',
        isSolving: false,
        pIP,
        problemsSolved: 0,
        time
      })
      // PING: 300ms to 800ms (S) -> (C)
      await sleep(Math.round(Math.random() * 5) + 3)
      fs.appendFileSync('record.txt', `SERVER: ACCEPTED ${ pIP } WLS REQUEST (${ this.state.workingList.size }/${ maximumWLLength })\n`)
      return true
    } else {
      if (Math.random() <= minimumWLLength / this.state.workingList.size) {
        const time = Date.now()
        if (this.state.workingList.size >= maximumWLLength) {
          fs.appendFileSync('record.txt', `SERVER: WL SIZE (${ this.state.workingList.size }) > MAX LEN\n`)
          await this.removeInactiveWLMembers('AGE')
        }
        // PING: 200ms to 500ms (S) -> (D)
        await sleep(Math.round(Math.random() * 3) + 2)
        this.state.workingList.set(pIP, {
          currentProblemID: '',
          isSolving: false,
          pIP,
          problemsSolved: 0,
          time
        })
        // PING: 300ms to 800ms (S) -> (C) 
        await sleep(Math.round(Math.random() * 5) + 3)
        fs.appendFileSync('record.txt', `SERVER: ACCEPTED ${ pIP } WLS REQUEST (${ this.state.workingList.size }/${ maximumWLLength })\n`)
        return true
      } else {
        // PING: 300ms to 800ms (S) -> (C) 
        await sleep(Math.round(Math.random() * 5) + 3)
        fs.appendFileSync('record.txt', `SERVER: DENIED ${ pIP } WLS REQUEST\n`)
        return false
      }
    }
  }
  // TODO: remove randomly but on basis of (+ve) activity and (-ve) age
  removeInactiveWLMembers = async (mode: 'RANDOM' | 'AGE') => {
    this.state.isRemovingInactiveMembers = true
    let removedMemberCount = 0, WLIterator: IterableIterator<[ string, TWorkingListMember ]> | [ string, TWorkingListMember ][]
    if (mode === 'RANDOM') WLIterator = this.state.workingList[ Symbol.iterator ]() 
    else WLIterator = [ ...this.state.workingList.entries() ].sort((memberA, memberB) => memberB[1].time - memberA[1].time)
    for (const member of WLIterator) {
      if ((maximumWLLength - removedMemberCount) <= moderateWLLength || this.state.isDead) break
      if (!member[1].isSolving) {
        // PING: 300ms to 800ms (S) -> (C) 
        await sleep(Math.round(Math.random() * 5) + 3)
        fs.appendFileSync('record.txt', `SERVER: REMOVING INACTIVE ${ member[1].pIP }\n`)
        this.getClientBypIP(member[1].pIP).updateWLStatus(false)
        // PING: 200ms to 500ms (S) -> (D)
        await sleep(Math.round(Math.random() * 3) + 2)
        this.state.workingList.delete(member[0])
        fs.appendFileSync('record.txt', `SERVER: REMOVED INACTIVE ${ member[1].pIP } (${ removedMemberCount + 1 }/${ maximumWLLength - moderateWLLength })\n`)
        removedMemberCount++
      }
    }
    this.state.isRemovingInactiveMembers = false
  }
  getContentList = async (requestedLength: number, cursorID: string): Promise<TContent[]> => {
    if (this.state.isDead) return []
    const contentListArray = [ ...this.state.contentList.values() ].sort((cA, cB) => cB.score - cA.score)
    const newCursorIndex = contentListArray.findIndex(content => content._id === cursorID) + 1
    // PING: 300ms to 800ms (S) -> (C) 
    await sleep(Math.round(Math.random() * 5) + 3)
    return contentListArray.slice(newCursorIndex, newCursorIndex + requestedLength)
  }
  updateContentListScores = async (pIP: string, updateContentList: TUpdateContent[]) => {
    if (this.state.isDead) return
    const focusWL = this.selectRandomWorkingListMembers(5, pIP)
    if (focusWL.length === 0) {
      // TODO: Print message in log.
      return
    } else focusWL.forEach(member => { this.state.workingList.get(member.pIP).isSolving = true })
    for (const content of updateContentList) {
      const problemID = Math.random().toString(36).replace('0.', '')
      this.state.activeProblems.set(problemID, {
        content: {
          _id: content._id,
          _v: content._v,
          score: content.newScore
        },
        initiator: pIP,
        members: focusWL.map(member => ({ pIP: member.pIP, conclusion: undefined })),
        time: Date.now()
      })
      for (const client of focusWL) {
        // PING: 300ms to 800ms (S) -> (C) 
        await sleep(Math.round(Math.random() * 5) + 3)
        this.getClientBypIP(client.pIP).verifyScore({ problemID, content })
      }
    }
  }
  registerConclusion = async (pIP: string, problemID: string, conclusion: boolean) => {
    const WLMember = this.state.workingList.get(pIP)
    if (!WLMember || !WLMember?.isSolving || WLMember?.currentProblemID !== problemID) return
    const problem = this.state.activeProblems.get(problemID), problemMember = problem.members.find(member => member.pIP === pIP)
    problemMember.conclusion = conclusion
    WLMember.currentProblemID = ''
    WLMember.isSolving = false
    WLMember.problemsSolved = WLMember.problemsSolved + 1
    this.judgeProblem(problem, problemID)
  }
  judgeProblem = (problem: TProblem, problemID: string) => {
    const conclusions = { yes: 0, no: 0 }
    problem.members.forEach(member => {
      if (member.conclusion === true) conclusions.yes++
      else if (member.conclusion === false) conclusions.no++
    })
    if (Date.now() - problem.time >= problemExpiryInterval) {
      this.freeProblemWorkers(problem.members.filter(member => member.conclusion === undefined))
      if (conclusions.yes > conclusions.no) this.updateContent(problem.content)
      this.deleteProblem(problemID)
    } else {
      if (conclusions.yes > Math.ceil(problem.members.length / 2)) this.updateContent(problem.content)
      else if (conclusions.no >= Math.floor(problem.members.length / 2)) {
        this.freeProblemWorkers(problem.members.filter(member => member.conclusion === undefined))
        this.deleteProblem(problemID)
      }
    }
  }
  updateContent = ({ _id, _v, score }: { _id: string, _v: number, score: number }): boolean => {
    const content = this.state.contentList.get(_id)
    if (content._v === _v) {
      content.score = score
      return true
    }
    return false
  }
  freeProblemWorkers = (members: TProblemMember[]) => {
    members.forEach(member => {
      const workingListMember = this.state.workingList.get(member.pIP)
      workingListMember.currentProblemID = ''
      workingListMember.isSolving = false
    })
  }
  deleteProblem = (problemID: string) => {
    this.state.activeProblems.delete(problemID)
  }
  selectRandomWorkingListMembers = (size?: number, ignore: string = '') => {
    if (this.state.isDead) return []
    return [ ...this.state.workingList.values() ]
      .map(member => ({ sort: Math.random(), member }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.member)
      .filter(member => member.pIP !== ignore)
      .slice(0, size)
  }
  kill = (print: boolean = true) => {
    this.state.isDead = true
    print && fs.appendFileSync('record.txt', `SERVER: KILLED\n`)
  }
}


// Exports:
export default Server
