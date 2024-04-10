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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Thumbnail } from 'shared-lib';

@Component({
  selector: 'app-thumbnail',
  templateUrl: './thumbnail.component.html',
  styleUrls: ['./thumbnail.component.scss'],
})
export class ThumbnailComponent implements OnInit {

  @Input() thumbnail: Thumbnail;
  @Output() openImage = new EventEmitter<Thumbnail>();

  ngOnInit(): void {
  }

  addImage() {
    this.openImage.emit(this.thumbnail)
  }

  getSimilarityColor(score: number): string {
    // Ensure the score is between 0 and 1
    const clampedScore = Math.max(0, Math.min(score, 1));

    // Calculate hue from red (0) to green (120) based on the score
    // A higher score should be more green, directly proportional
    const hue = clampedScore * 120;

    // Return the CSS HSL color string
    // Saturation is set to 100% and lightness to 50% for vibrant colors
    return `hsl(${hue}, 100%, 50%)`;
  }
}
