import { AudioEngine } from './AudioEngine';

export interface Choice {
  label: string;
  callback: (() => void) | null;
}

export class Dialogue {
  private ui: HTMLElement;
  private speakerName: HTMLElement;
  private dialogueText: HTMLElement;
  private choicesContainer: HTMLElement;
  private onComplete: () => void;
  private audio: AudioEngine;
  private typewriterInterval: number | null = null;
  private fullText: string = '';
  private currentChoices: Choice[] = [];

  constructor(ui: HTMLElement, onComplete: () => void, audio: AudioEngine) {
    this.ui = ui;
    this.speakerName = document.getElementById('speaker-name')!;
    this.dialogueText = document.getElementById('dialogue-text')!;
    this.choicesContainer = document.getElementById('choices-container')!;
    this.onComplete = onComplete;
    this.audio = audio;
  }

  show(speaker: string, text: string, choices: Choice[]) {
    this.ui.classList.remove('hidden');
    this.speakerName.textContent = speaker;
    this.fullText = text;
    this.currentChoices = choices;
    this.dialogueText.textContent = '';
    this.choicesContainer.innerHTML = '';
    
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    
    let i = 0;
    this.typewriterInterval = window.setInterval(() => {
      if (i < this.fullText.length) {
        this.dialogueText.textContent += this.fullText.charAt(i);
        this.audio.playBeep(440 + Math.random() * 100, 0.05);
        i++;
      } else {
        clearInterval(this.typewriterInterval!);
        this.typewriterInterval = null;
        this.showChoices(choices);
      }
    }, 30);
  }

  skip() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
      this.dialogueText.textContent = this.fullText;
      this.showChoices(this.currentChoices);
    }
  }

  promptInput(speaker: string, text: string, onConfirm: (value: string) => void) {
    this.ui.classList.remove('hidden');
    this.speakerName.textContent = speaker;
    this.dialogueText.innerHTML = text;
    this.choicesContainer.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'bg-gray-700 text-white p-2 m-1 rounded border border-white w-full';
    input.placeholder = 'Tapez ici...';
    this.choicesContainer.appendChild(input);

    const btn = document.createElement('button');
    btn.textContent = 'Confirmer';
    btn.className = 'bg-blue-600 text-white p-2 m-1 rounded';
    btn.onclick = () => {
      const val = input.value;
      this.hide();
      onConfirm(val);
    };
    this.choicesContainer.appendChild(btn);

    input.focus();
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        btn.click();
      }
    };
  }

  private showChoices(choices: Choice[]) {
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.textContent = choice.label;
      btn.className = 'bg-gray-800 text-white p-2 m-1 rounded';
      btn.onclick = () => {
        this.hide();
        if (choice.callback) {
          choice.callback();
        }
      };
      this.choicesContainer.appendChild(btn);
    });
  }

  hide() {
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    this.ui.classList.add('hidden');
    this.onComplete();
  }

  hideWithoutCallback() {
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
    this.ui.classList.add('hidden');
  }
}
