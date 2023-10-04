import { Component, OnInit, inject } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Message} from './models';
import {TextingService} from './texting.service';
import {Observable, Subscription, tap} from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  form!: FormGroup
  messages: string[] = []

  private obs$!: Subscription
  conn = false

  private fb = inject(FormBuilder)
  private textingSvc = inject(TextingService)

  ngOnInit(): void {
    this.form = this.fb.group({
      username: this.fb.control<string>('fred', [ Validators.required ]),
      text: this.fb.control<string>('', [ Validators.required ])
    })
  }

  connect() {
    this.obs$ = this.textingSvc.connect().subscribe({
      next: data => {
        console.info('>>>> data: ', data)
      },
      error: err => {
        console.error('>>>> error: ', err)
      },
      complete: () => {
        console.info('completed!')
      }
    })
    this.conn = true
  }

  disconnect() {
    this.textingSvc.disconnect()
    this.conn = false
  }

  send() {
    const msg: Message = this.form.value
    console.info('msg: ', msg)
    this.textingSvc.send(msg)
      .then(() => {
        this.form.controls['text'].patchValue('')
      })
      .catch(error => {
        console.error('error: ', error)
      })
  }
}
