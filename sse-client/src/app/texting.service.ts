import {HttpClient} from "@angular/common/http";
import {Injectable, NgZone, inject} from "@angular/core";
import {Observable, Subject, lastValueFrom} from "rxjs";
import {Message} from "./models";

const BASE = 'http://localhost:5000'
//const BASE = ''

@Injectable()
export class TextingService {

  private http = inject(HttpClient)
  private zone = inject(NgZone)

  private sse!: EventSource
  private sub!: Subject<string>

  send(message: Message): Promise<any> {
    return lastValueFrom(this.http.post<any>(`${BASE}/api/data`, message))
  }

  disconnect() {
    this.sub.complete()
    this.sse.close()
  }

  connect(name = 'anonymous'): Observable<string> {

    this.sub = new Subject()

    this.sse = new EventSource(`${BASE}/api/stream?username=${name}`)

    this.sse.onmessage = (event: MessageEvent) => {
      console.info('>>> on message: ', event)
      this.zone.run(() => this.sub.next(event.data as string))
    }
    this.sse.onopen = () => {
      console.info('>>> connection opened')
    }
    this.sse.onerror = (err) => {
      this.zone.run(() => this.sub.error(`Error: ${err}`))
    }

    //@ts-ignore
    return this.sub.asObservable()
  }

  close() {
    if (!this.sub.closed)
      this.sub.complete()
  }

}
