export interface Item {
  id: string;
  name: string;
  emoji: string;
}

export class Inventory {
  private items: Item[] = [];
  private uiElement: HTMLElement;

  constructor(uiElement: HTMLElement) {
    this.uiElement = uiElement;
  }

  hasItem(id: string): boolean {
    return this.items.some(item => item.id === id);
  }

  addItem(id: string, name: string, emoji: string) {
    this.items.push({ id, name, emoji });
    this.updateUI();
  }

  removeItem(id: string) {
    this.items = this.items.filter(item => item.id !== id);
    this.updateUI();
  }

  private updateUI() {
    this.uiElement.innerHTML = '<h3 class="font-bold mb-2">Inventaire</h3>';
    this.items.forEach(item => {
      this.uiElement.innerHTML += `<div class="flex items-center gap-2">${item.emoji} ${item.name}</div>`;
    });
    
    if (this.items.length > 0) {
      this.uiElement.classList.remove('hidden');
    } else {
      this.uiElement.classList.add('hidden');
    }
  }
}
