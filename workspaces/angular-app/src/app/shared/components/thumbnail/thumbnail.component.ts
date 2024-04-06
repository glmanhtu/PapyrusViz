/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
