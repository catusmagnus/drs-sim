// Packages:
import fs from 'fs'
import { sleep, rank } from './functions'


// Imports:
import Server from './server'


// Typescript:
import { IClientState, TUpdateContent } from './types'


// Constants:
const WLMemberRetryInterval = 3 * 6 * 1000 // 30 minutes


// Class:
class Client {
  intervalIDs: NodeJS.Timer[] = []
  server: Server
  state: IClientState = {
    contentList: {
      accumulator: [],
      new: []
    },
    isDead: false,
    lastContentID: '',
    pIP: '',
    WL: {
      lastUpdate: 0,
      isMember: false
    }
  }
  constructor (pIP: string, server: Server) {
    this.state.pIP = pIP
    this.server = server;
    (async () => {
      if (!this.state.WL.isMember) {
        fs.appendFileSync('record.txt', `${ this.state.pIP }: REQUESTING WLS\n`)
        await this.requestWLStatus()
      }
    })()
    this.intervalIDs.push(setInterval(async () => {
      if (!this.state.WL.isMember) {
        fs.appendFileSync('record.txt', `${ this.state.pIP }: REQUESTING WLS\n`)
        await this.requestWLStatus()
      }
    }, WLMemberRetryInterval))
  }
  requestWLStatus = async (): Promise<boolean> => {
    if (this.state.isDead) return
    // PING: 300ms to 800ms (C) -> (S) 
    await sleep(Math.round(Math.random() * 5) + 3)
    const res = await this.server.processWLRequest(this.state.pIP)
    if (res) this.updateWLStatus(true)
    else this.updateWLStatus(false)
    return res
  }
  updateWLStatus = (newWLStatus: boolean) => {
    if (this.state.isDead) return
    this.state.WL.isMember = newWLStatus
    this.state.WL.lastUpdate = Date.now()
    fs.appendFileSync('record.txt', `${ this.state.pIP }${ this.state.WL.isMember ? ' [WL]' : '' }: WLS ${ this.state.WL.isMember ? 'GRANTED' : 'REVOKED' }\n`)
  }
  getLastWLUpdateTime = () => this.state.WL.lastUpdate
  requestNewContent = async (length: number) => {
    if (this.state.isDead) return
    const updateContentList: TUpdateContent[] = []
    // PING: 300ms to 800ms (C) -> (S) 
    await sleep(Math.round(Math.random() * 5) + 3)
    const newContentList = await this.server.getContentList(length, this.state.lastContentID)
    this.state.contentList.accumulator = this.state.contentList.accumulator.concat(newContentList)
    this.state.contentList.new = newContentList
    for (const content of newContentList) {
      const newScore = rank(content.votes.up, content.votes.down, Date.now() - content.time.createdAt)
      if (Math.abs(content.score - newScore) > 0.5) updateContentList.push({ ...content, newScore })
    }
    await this.updateContentListScores(updateContentList)
  }
  updateContentListScores = async (updateContentList: TUpdateContent[]) => {
    // PING: 300ms to 800ms (C) -> (S) 
    await sleep(Math.round(Math.random() * 5) + 3)
    this.server.updateContentListScores(this.state.pIP, updateContentList)
  }
  verifyScore = async ({ problemID, content }: { problemID: string, content: TUpdateContent }) => {
    // TODO: Add a tendency to fail and disconnect.
    const newScore = rank(content.votes.up, content.votes.down, Date.now() - content.time.createdAt)
    // PING: 300ms to 800ms (C) -> (S) 
    await sleep(Math.round(Math.random() * 5) + 3)
    if ((Math.abs(content.score - newScore) > 0.5) && newScore === content.newScore) this.server.registerConclusion(this.state.pIP, problemID, true)
    else this.server.registerConclusion(this.state.pIP, problemID, false)
  }
  kill = ({ print }: { print: boolean }) => {
    this.intervalIDs.forEach(clearInterval)
    this.state.isDead = true
    print && fs.appendFileSync('record.txt', `${ this.state.pIP }: KILLED\n`)
  }
}


// Exports:
export default Client
