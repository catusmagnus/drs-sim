// Packages:
import fs from 'fs'
import { sleep, clearLastLines } from './functions'


// Imports:
import Client from './client';
import Server from './server';


// Variables:
/**
 * NOTE: clientObjectList exists only for simulation purposes. In a real world application, a server can close a TCP socket with a client directly with
 * The knowledge of it's pIP. When the socket closes, the clients execute updateWLStatus(false) themselves.
 */
const clientList: Map<string, Client> = new Map()


// Functions:
const getClientBypIP = (pIP: string) => clientList.get(pIP)

const spawnClient = (server: Server) => {
  const pIP = (Math.floor(Math.random() * 255) + 1) + '.' + (Math.floor(Math.random() * 255)) + '.' + (Math.floor(Math.random() * 255)) + '.' + (Math.floor(Math.random() * 255))
  const client = new Client(pIP, server)
  clientList.set(pIP, client)
  return client
}

const simulate = async ({ maxClients, simHours }: { maxClients: number, simHours: number }) => {
  const server = new Server(getClientBypIP), realDuration = (simHours * 60 * 60 * 1000) / 100
  let timePassed = 0, clientCount = 0
  console.log(`Simulation will run for ${ realDuration / 1000 } seconds`)
  fs.appendFileSync('record.txt', `Maximum spawnable clients: ${ maxClients }\nSimulation hours: ${ simHours }\nDuration in real time: ${ realDuration / 1000 } seconds\n`)
  fs.appendFileSync('record.txt', `---------- SIMULATION BEGIN ----------\n`)
  const intervalID = setInterval(() => {
    if (timePassed < realDuration) {
      timePassed = timePassed + 100
      console.log(`${ (realDuration - timePassed) / 1000 } seconds left`)
      clearLastLines(1)
      if ((clientCount < maxClients) && Math.random() <= ((realDuration - timePassed) / realDuration)) {
        const client = spawnClient(server)
        fs.appendFileSync('record.txt', `${ client.state.pIP }: SPAWNED (${ clientCount++ + 1 }/${ maxClients })\n`)
      }
      // if ()
    } else {
      clientList.forEach(client => client.kill({ print: false }))
      server.kill()
      fs.appendFileSync('record.txt', `----------- SIMULATION END -----------\n`)
      clearInterval(intervalID)
      console.log(`Simulation over`)
      return
    }
  }, 100)
}


// Execution:
simulate({ maxClients: 50, simHours: 1 })
