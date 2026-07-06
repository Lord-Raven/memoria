/* Need an exported function for building prompts. I want this function to build a structure and then format it:
<Task>
<PromptBlockTitle>
Some content here
</PromptBlockTitle>
<AnotherPromptBlockTitle>
Some more content here
</AnotherPromptBlockTitle>
</Task>
The precise format is subject to change, so the key is creating a function that builds more agnostic structure first,
which can be recycled throughout my application. The functions could use chaining:
buildPrompt().addBlock('PromptBlockTitle', 'Some content here')
.addBlock('AnotherPromptBlockTitle', 'Some more content here')
.format() // Returns the formatted string
 */
// typescript
export type PromptBlock = {
  title: string;
  content: string;
};

export type PromptStructure = {
  rootTag: string;
  blocks: PromptBlock[];
};

export type FormatOptions = {
  pretty?: boolean; // when true, adds newlines and indentation
  indent?: string;  // indent string for pretty mode
};

/**
 * PromptBuilder builds an agnostic structure of prompt blocks and formats it.
 * Usage:
 *   import { buildPrompt } from './src/utils/PromptBuilder';
 *   const s = buildPrompt('Task')
 *     .addBlock('PromptBlockTitle', 'Some content here')
 *     .addBlock('AnotherPromptBlockTitle', 'Some more content here')
 *     .format();
 */
export class PromptBuilder {
  private rootTag: string;
  private blocks: PromptBlock[] = [];

  constructor(rootTag = 'Task') {
    this.rootTag = this.sanitizeTag(rootTag) || 'Task';
  }

  // addBlock accepts strings, objects, arrays, or functions returning string
  addBlock(title: string, content: string | object | Array<any> | (() => string)): this {
    const c = this.stringifyContent(content);
    const t = this.sanitizeTag(title) || 'Block';
    this.blocks.push({ title: t, content: c });
    return this;
  }

  removeBlock(indexOrTitle: number | string): this {
    if (typeof indexOrTitle === 'number') {
      if (indexOrTitle >= 0 && indexOrTitle < this.blocks.length) {
        this.blocks.splice(indexOrTitle, 1);
      }
    } else {
      this.blocks = this.blocks.filter(b => b.title !== this.sanitizeTag(indexOrTitle));
    }
    return this;
  }

  setRootTag(tag: string): this {
    this.rootTag = this.sanitizeTag(tag) || this.rootTag;
    return this;
  }

  clear(): this {
    this.blocks = [];
    return this;
  }

  build(): PromptStructure {
    // returns the neutral structure for reuse
    return {
      rootTag: this.rootTag,
      blocks: this.blocks.slice(),
    };
  }

  format(opts: FormatOptions = { pretty: true, indent: '  ' }): string {
    const { pretty = true, indent = '  ' } = opts;
    const nl = pretty ? '\n' : '';
    const ind = pretty ? indent : '';

    const parts: string[] = [];
    parts.push(`<${this.rootTag}>${nl}`);

    this.blocks.forEach((b, i) => {
      if (pretty) parts.push(ind);
      parts.push(`<${b.title}>${nl}`);
      if (pretty) parts.push(pretty ? ind.repeat(2) : '');
      // content may already contain newlines; preserve them but indent if pretty
      const content = pretty ? this.indentContent(b.content, ind.repeat(2)) : b.content;
      parts.push(content + nl);
      if (pretty) parts.push(ind);
      parts.push(`</${b.title}>${nl}`);
    });

    parts.push(`</${this.rootTag}>`);
    return parts.join('');
  }

  // helper: returns sanitized tag (letters, numbers, underscore, dash allowed)
  private sanitizeTag(tag: string): string {
    return String(tag).trim().replace(/[^A-Za-z0-9_\-]/g, '') || '';
  }

  // helper: stringify content into a stable string
  private stringifyContent(content: string | object | Array<any> | (() => string)): string {
    if (typeof content === 'function') {
      try {
        return String((content as () => string)());
      } catch {
        return '';
      }
    }
    if (typeof content === 'string') return content;
    try {
      // objects/arrays -> JSON with compact formatting
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  // helper: indent multiline content for pretty printing
  private indentContent(content: string, indent: string): string {
    if (!content) return '';
    return content
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : indent + line))
      .join('\n');
  }
}

// convenience factory function matching requested usage: buildPrompt().addBlock(...)
export function buildPrompt(rootTag?: string): PromptBuilder {
  return new PromptBuilder(rootTag);
}

export default PromptBuilder;