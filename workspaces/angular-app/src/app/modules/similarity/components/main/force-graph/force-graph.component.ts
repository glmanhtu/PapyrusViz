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

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  FLink,
  Link, MatchingResponse,
  ProjectDTO, RecordImgMatchingResponse, RecordMatchingRequest, SimilarityRequest,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import * as d3d from 'd3-force-3d';
import { FormControl, FormGroup } from '@angular/forms';
import ForceGraph, { ForceGraphInstance, NodeObject } from 'force-graph';


export interface Edge {
  source: string;
  target: string;
  weight?: number;
}

export interface Communities {
  [id: string]: number;
}

export interface jLouvainGenerator {
  (): Communities;
  nodes: (nodes: string[]) => jLouvainGenerator;
  edges: (edges: Edge[]) => jLouvainGenerator;
}

declare function jLouvain(): jLouvainGenerator;


interface Node extends NodeObject {
  id: string;
  name: string;
  group: number
}

interface InfoPanelData {
  name: string;
  bulletins: string[];
  imageSrc: string;
  width: number;
  height: number;
}

function extractLeadingNumbers(inputString: string): number | null {
  // Regular expression to match leading numbers
  const leadingNumbersRegex = /^(\d+)/;

  // Executing the regex on the input string
  const match = inputString.match(leadingNumbersRegex);

  // If there's a match, return the parsed number, otherwise return null
  if (match && match[1]) {
    return parseInt(match[1], 10);
  } else {
    return null;
  }
}

function drawInfoPanel(ctx: CanvasRenderingContext2D, x: number, y: number, data: InfoPanelData) {
  const lineHeight = 20;
  const bulletinsStartX = x + 20;
  const imageStartX = x + 70;
  const imageStartY = y + 40;

  const panelWidth = 300; // Adjust as needed
  const bulletinsHeight = data.bulletins.reduce((acc ,_) => acc + lineHeight, 0) + lineHeight + 25
  const panelHeight = Math.max(data.height + 50, bulletinsHeight); // Height of image plus padding
  const borderRadius = 10;
  const borderWidth = 1;

  // Draw round rectangle
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.moveTo(x + borderRadius, y + 0.5);
  ctx.arcTo(x + panelWidth, y + 0.5, x + panelWidth, y + panelHeight + 0.5, borderRadius);
  ctx.arcTo(x + panelWidth, y + panelHeight + 0.5, x, y + panelHeight + 0.5, borderRadius);
  ctx.arcTo(x, y + panelHeight + 0.5, x, y + 0.5, borderRadius);
  ctx.arcTo(x, y + 0.5, x + panelWidth, y + 0.5, borderRadius);
  // ctx.roundRect(x, y, panelWidth, panelHeight, borderRadius)
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  x = x + 10
  y = y + 10

  // Draw name
  ctx.fillStyle = 'black';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(data.name, x, y + lineHeight);

  // Draw bulletins
  ctx.font = '14px Arial';
  y += 5
  data.bulletins.forEach((bulletin, index) => {
    ctx.fillText(`• ${bulletin}`, bulletinsStartX, y + lineHeight * (index + 2));
  });

  // Load and draw image
  const img = new Image();
  img.src = data.imageSrc;
  ctx.drawImage(img, imageStartX, imageStartY, data.width, data.height);
}

@Component({
  selector: 'sim-force-graph',
  providers: [NgbNav],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './force-graph.component.html',
  styleUrls: ['./force-graph.component.scss'],
})
export class ForceGraphComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer') chartContainer: ElementRef;

  @Input()
  projectDto: ProjectDTO;
  @Input()
  matching: MatchingResponse;

  @Input()
  threshold: FormControl;

  graphObject: ForceGraphInstance;

  @Input()
  forceControl: FormGroup;

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngOnDestroy(): void {
    this.graphObject.pauseAnimation();
    this.graphObject.graphData({ nodes: [], links: []});
  }

  ngAfterViewInit(): void {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();

    this.graphObject = ForceGraph()(this.chartContainer.nativeElement);
    this.graphObject.d3Force('x', d3d.forceX(rect.width / 2).strength(0.1))
    this.graphObject.d3Force('y', d3d.forceY(rect.height / 2).strength(0.1))
    // this.graphObject.d3Force('link')!.strength((link: Link) => (2 / link.similarity))
    this.graphObject.centerAt(rect.left, rect.top)
    // eslint-disable-next-line
    this.graphObject.linkLabel(x => (x as any).similarity)
    this.graphObject.nodeLabel(_ => "")
      .autoPauseRedraw(false) // keep redrawing after engine has stopped
      // .linkDirectionalParticles(4)
      .nodeId('id')
      .nodeAutoColorBy('group')


      // .nodePointerAreaPaint((node, color, ctx) => {
      //   ctx.fillStyle = color;
      //   const bckgDimensions = (node as any).__bckgDimensions;
      //   bckgDimensions && ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
      // });

    this.updateGraph(this.threshold.value)
    this.forceControl.valueChanges.subscribe((values) => {
      console.log(values)
      this.updateGraph(this.threshold.value);
      // console.log(this.graphObject.d3Force('charge')!.strength())
      // this.graphObject.d3ReheatSimulation()
    });
    this.threshold.valueChanges.subscribe(async (val) => {
      if (val > 0.5) {
        console.log('Update ' + val )
        await this.updateGraph(val);
      }
    })
  }


  ngOnInit(): void {
  }

  drawTooltipNodes(ctx: CanvasRenderingContext2D, nodes: Set<Node>, imgMap: Map<string, InfoPanelData>) {
    ctx.textAlign = 'left';
    for (const node of nodes) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, 2 * 1.4, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'orange';
      ctx.fill();

      const recordId = node.id as string;

      if (imgMap.has(recordId)) {
        drawInfoPanel(ctx, node.x!, node.y!, imgMap.get(recordId)!)
      } else {
        this.eIpc.send<RecordMatchingRequest, RecordImgMatchingResponse[]>('matching:get-record-imgs', {
          projectPath: this.projectDto.path,
          recordId: parseInt(node.id as string),
          matchingId: this.matching.id
        }).then(items => {
          const im = items[0];
          const ratio = im.img.width > im.img.height
            ? 200 / im.img.width
            : 200 / im.img.height
          const item: InfoPanelData = {
            name: im.name,
            imageSrc: im.img.path,
            bulletins: [...new Set<string>(items.map(x => x.category.name))],
            width: Math.round(im.img.width * ratio),
            height: Math.round(im.img.height * ratio)
          }
          console.log(item)
          imgMap.set(recordId, item);
        });
      }
    }
  }

  extractLinkNodes(data: Link[]): [Node[], FLink[]] {
    const links: FLink[] = [];
    const nodes = new Map<string, Node>();
    for (const item of data) {
      links.push({
        source: item.source.id,
        target: item.target.id,
        similarity: item.similarity
      })
      for (const node of [item.source, item.target]) {
        if (!nodes.has(node.id)) {
          nodes.set(node.id, {
            ...node,
            group: extractLeadingNumbers(node.name) || 0
          })
        }
      }
    }
    return [[...nodes.values()], links]
  }

  async updateGraph(similarity: number) {

    // this.simulation.stop();
    this.graphObject
      .d3Force('charge')!.strength(this.forceControl.getRawValue()['charge'])

    const autoColor = parseInt(this.forceControl.getRawValue()['autoColor']);
    const defaultColor = 'rgba(31, 120, 180, 0.92)';
    const highlightNodes = new Set<Node>();
    const imgMap = new Map<string, InfoPanelData>;

    this.graphObject.onNodeHover(nodeHover => {
      highlightNodes.clear();
      if (nodeHover) {
        highlightNodes.add(nodeHover as Node);
      }
    })

    // const color = d3.scaleOrdinal(d3.schemeCategory10);
    const data = await this.eIpc.send<SimilarityRequest, Link[]>('matching:fetch-similarity', {
      projectPath: this.projectDto.path,
      matchingId: this.matching.id,
      similarity: similarity
    })

    this.graphObject.pauseAnimation();
    const [nodeArr, links] =  this.extractLinkNodes(data)

    if (autoColor === 2) {
      const community = jLouvain().nodes(nodeArr.map(x => x.id))
        .edges(links.map(x => ({ ...x, weight: x.similarity })))
      const community_assignment_result = community()
      for (const node of nodeArr) {
        node.group = community_assignment_result[node.id]
      }
    }

    this.graphObject
      .graphData({nodes: nodeArr, links: links})
      .nodeCanvasObject((node, ctx, globalScale) => {
        if (this.forceControl.getRawValue()['textMode'] === '1') {
          const label = (node as Node).name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // eslint-disable-next-line
          ctx.fillStyle = autoColor > 0 ? (node as any).color : defaultColor;
          ctx.fillText(label, node.x!, node.y!);

          // (node as any).__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        } else {

          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 3 * 1.4, 0, 2 * Math.PI, false);
          // eslint-disable-next-line
          ctx.fillStyle = autoColor > 0 ? (node as any).color : defaultColor;
          ctx.fill();
        }

        if (node.id === nodeArr[nodeArr.length - 1].id) {
          // Start to draw tooltip when all nodes are drawn
          this.drawTooltipNodes(ctx, highlightNodes, imgMap)
        }
      })
    this.graphObject.resumeAnimation();
  }
}
