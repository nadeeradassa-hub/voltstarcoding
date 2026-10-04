export type TargetPlatform =
  | 'ESP32 DevKit V1'
  | 'Arduino Uno R3'
  | 'Arduino Nano'
  | 'Raspberry Pi Pico (RP2040)'
  | 'STM32 BluePill'
  | 'Modern C++20 / Robotics';

export interface ComponentPin {
  name: string;
  type?: 'power' | 'ground' | 'digital' | 'analog' | 'i2c' | 'spi' | 'pwm';
}

export interface WiringComponent {
  id: string;
  name: string;
  type: string;
  icon?: string;
  pins: string[];
  assignedPin?: string;
  x: number;
  y: number;
}

export interface WiringConnection {
  fromPin: string;
  toComponentId: string;
  toPin: string;
  color: string;
  label?: string;
}

export interface WiringBoard {
  id: string;
  name: string;
  type: string;
  pins: string[];
}

export interface WiringDiagramSpec {
  board: WiringBoard;
  components: WiringComponent[];
  connections: WiringConnection[];
}

export interface BomItem {
  name: string;
  quantity: number;
  spec: string;
  role: string;
}

export interface PinTableRow {
  boardPin: string;
  component: string;
  componentPin: string;
  wireColor: string;
  signalType: string;
  notes: string;
}

export interface CodeDiagnostic {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fixSuggestion?: string;
}

export interface ProjectData {
  projectTitle: string;
  targetPlatform: TargetPlatform | string;
  summary: string;
  code: string;
  headerCode?: string;
  explanation: string;
  bom: BomItem[];
  pinTable: PinTableRow[];
  wiringDiagram: WiringDiagramSpec;
  potentialIssues: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ComponentIntelResult {
  query: string;
  summary: string;
  recommendedPins: string;
  libraryName: string;
  codeSnippet: string;
  sources: GroundingSource[];
  searchQueries?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
}

