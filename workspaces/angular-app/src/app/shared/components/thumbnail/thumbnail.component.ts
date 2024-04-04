import { Component, Inject, Input, OnInit } from '@angular/core';
import { Thumbnail } from 'shared-lib';
import { BroadcastService, IMG_BROADCAST_SERVICE_TOKEN } from '../../../services/broadcast.service';

@Component({
  selector: 'app-thumbnail',
  templateUrl: './thumbnail.component.html',
  styleUrls: ['./thumbnail.component.scss'],
})
export class ThumbnailComponent implements OnInit {

  @Input() thumbnail: Thumbnail;

  constructor(
    @Inject(IMG_BROADCAST_SERVICE_TOKEN) private imgBroadcastService: BroadcastService<Thumbnail>,
  ) {}

  ngOnInit(): void {
  }

  addImage() {
    this.imgBroadcastService.publish(this.thumbnail)
  }
}
