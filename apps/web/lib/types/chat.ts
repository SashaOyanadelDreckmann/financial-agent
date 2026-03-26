export type AgentBlock =
  | {
      type: 'document';
      title?: string;
      sections?: Array<{
        heading: string;
        content: string;
      }>;
    }
  | {
      type: 'chart';
      chart: {
        kind: 'line' | 'bar' | 'area';
        title: string;
        subtitle?: string;
        xKey: string;
        yKey: string;
        data: Array<Record<string, number>>;
        format?: 'currency' | 'percentage' | 'number';
        currency?: string;
      };
    }
  | {
      type: 'table';
      table: {
        title: string;
        headers: string[];
        rows: string[][];
        note?: string;
      };
    };

export type UIEvent =
  | {
      type: 'TOAST';
      payload: {
        kind?: 'info' | 'success' | 'warn' | 'error';
        message: string;
      };
    }
  | {
      type: 'FOCUS_ARTIFACT';
      payload: { artifactId: string };
    }
  | {
      type: 'OPEN_ARTIFACT';
      payload: { artifactId: string };
    }
  | {
      type: 'SAVE_ARTIFACT';
      payload: {
        artifactId: string;
        location?: 'simulaciones' | 'planes' | 'reportes';
      };
    }
  | {
      type: 'ANIMATE_TRANSFER';
      payload: {
        from: 'chat';
        to: 'panel';
        artifactId: string;
      };
    };
