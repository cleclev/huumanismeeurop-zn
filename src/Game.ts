import { Player } from './Player';
import { Entity } from './Entity';
import { Inventory } from './Inventory';
import { Dialogue } from './Dialogue';
import { Level } from './Level';
import { AudioEngine } from './AudioEngine';
import { ParticleSystem } from './ParticleSystem';

export enum GameState {
  PLAYING,
  DIALOGUE,
  TRANSITION,
  ENDING
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  entities: Entity[] = [];
  state: GameState = GameState.PLAYING;
  inventory: Inventory;
  dialogue: Dialogue;
  keys: { [key: string]: boolean } = {};
  progress: { [key: string]: any } = {};
  currentLevel!: Level;
  currentLevelIndex: number = 0;
  audio: AudioEngine;
  particles: ParticleSystem;
  transitionAlpha: number = 0;
  creditsScrollY: number = 0;
  endingTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.player = new Player(400, 300);
    this.inventory = new Inventory(document.getElementById('inventory-ui')!);
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.dialogue = new Dialogue(document.getElementById('dialogue-ui')!, () => this.state = GameState.PLAYING, this.audio);

    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      this.audio.init();
    });
    window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'e' || e.key === ' ') && this.state === GameState.PLAYING) {
        this.interact();
      } else if (e.key === ' ' && this.state === GameState.DIALOGUE) {
        this.dialogue.skip();
      }
      if (e.key.toLowerCase() === 'm' && this.state === GameState.PLAYING) {
        this.state = GameState.DIALOGUE;
        this.dialogue.show('Menu Secret', 'Téléportation vers quel niveau ?', [
          { label: 'Niveau 0', callback: () => this.loadLevel(0) },
          { label: 'Niveau 1', callback: () => this.loadLevel(1) },
          { label: 'Niveau 2', callback: () => this.loadLevel(2) },
          { label: 'Niveau 3', callback: () => this.loadLevel(3) },
          { label: 'Niveau 4', callback: () => this.loadLevel(4) },
          { label: 'Niveau 5', callback: () => this.loadLevel(5) },
          { label: 'Annuler', callback: null }
        ]);
      }
    });

    this.loadLevel(0);
    this.loop();
  }

  loadLevel(index: number) {
    this.state = GameState.TRANSITION;
    this.transitionAlpha = 0;
    this.inventory.clear();
    this.currentLevelIndex = index;
    
    const animateTransition = () => {
      this.transitionAlpha += 0.05;
      if (this.transitionAlpha < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        if (index === 0) {
          this.currentLevel = this.createLevel0();
        } else if (index === 1) {
          this.currentLevel = this.createLevel1();
        } else if (index === 2) {
          this.currentLevel = this.createLevel2();
        } else if (index === 3) {
          this.currentLevel = this.createLevel3();
        } else if (index === 4) {
          this.currentLevel = this.createLevel4();
        } else if (index === 5) {
          this.currentLevel = this.createLevel5();
        }

        if (this.progress['resistedFlux']) {
          this.player.emoji = '🧑🎨';
        }
        
        this.player.x = this.currentLevel.spawn.x;
        this.player.y = this.currentLevel.spawn.y;
        this.entities = this.currentLevel.entities;
        
        const fadeOut = () => {
          this.transitionAlpha -= 0.05;
          if (this.transitionAlpha > 0) {
            requestAnimationFrame(fadeOut);
          } else {
            if (index === 2) {
              this.startLevel2Sequence();
            } else {
              this.state = GameState.PLAYING;
            }
          }
        };
        fadeOut();
      }
    };
    animateTransition();
  }

  startLevel2Sequence() {
    this.state = GameState.DIALOGUE;
    this.progress['level2Words'] = [];
    this.showWordSearch();
  }

  showWordSearch() {
    this.state = GameState.DIALOGUE;
    const wordsToFind = ['DICTATURE', 'PROPAGANDE', 'ARMEE', 'GUERRE', 'POUVOIR'];
    const found = this.progress['level2Words'] || [];
    const remaining = wordsToFind.filter(w => !found.includes(w));

    if (remaining.length === 0) {
      this.showLevel2QCM();
      return;
    }

    const grid = `<pre style="font-family: monospace; line-height: 1.2; background: #222; padding: 10px; border-radius: 5px; display: inline-block;">
P R O P A G A N D E X Z
O G X L O K J H G F D S
U U U Q W D M K L P O I
V E C E R I Y T R E W Q
O R L K R C X Z A S D F
I R O I U T G H J K L M
R E W E R A T Y U I O P
A S D F G T H J K L Z X
C V B N M U Q W E R T Y
U I O P A R S D F G H J
K L Z X C E V B N M Q W
X A R M E E J K L M N P</pre>`;

    const text = `Trouvez les 5 mots clés liés au pouvoir dans cette grille :<br><br>${grid}<br><br>Mots trouvés : ${found.join(', ') || 'Aucun'}<br>Il en reste ${remaining.length}.`;

    this.dialogue.promptInput('Système', text, (val) => {
      const word = val.trim().toUpperCase();
      if (wordsToFind.includes(word)) {
        if (!found.includes(word)) {
          found.push(word);
          this.progress['level2Words'] = found;
          this.audio.play('success');
          this.showWordSearch();
        } else {
          this.state = GameState.DIALOGUE;
          this.dialogue.show('Système', "Vous avez déjà trouvé ce mot !", [{ label: 'Continuer', callback: () => this.showWordSearch() }]);
        }
      } else {
        this.audio.play('error');
        this.state = GameState.DIALOGUE;
        this.dialogue.show('Système', "Ce mot n'est pas dans la grille ou n'est pas un mot clé.", [{ label: 'Réessayer', callback: () => this.showWordSearch() }]);
      }
    });
  }

  showLevel2QCM() {
    this.state = GameState.DIALOGUE;
    this.dialogue.show('Système', "Bravo ! Vous avez identifié les piliers de cette zone. Alors, selon vous, quel est le contexte de ce niveau ?", [
      { label: '1. Une compétition de cuisine médiévale entre chevaliers', callback: () => this.handleQCM(false) },
      { label: '2. Une guerre, des régimes autoritaires et la propagande', callback: () => this.handleQCM(true) },
      { label: '3. Un concours du plus beau bouquet de fleurs soviétique', callback: () => this.handleQCM(false) },
      { label: '4. Les Jeux olympiques des gladiateurs romains', callback: () => this.handleQCM(false) },
      { label: '5. Une exposition sur la mode des uniformes du XXe siècle', callback: () => this.handleQCM(false) }
    ]);
  }

  handleQCM(correct: boolean) {
    this.state = GameState.DIALOGUE;
    if (correct) {
      this.audio.play('success');
      this.dialogue.show('Système', "Félicitations ! Vous avez saisi l'essence de ce lieu. Vous pouvez maintenant explorer la Cité de l'Ordre.", [{ label: 'Entrer', callback: () => { this.state = GameState.PLAYING; } }]);
    } else {
      this.audio.play('error');
      this.dialogue.show('Système', "Non, ici on ne cuisine pas, on modèle les esprits. Réessayez !", [{ label: 'Réessayer', callback: () => this.showLevel2QCM() }]);
    }
  }

  createLevel0(): Level {
    return {
      spawn: { x: 400, y: 500 },
      drawBackground: (ctx, width, height) => {
        const tileSize = 50;
        for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
            ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#cccccc' : '#999999';
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
      },
      entities: [
        {
          id: 'cle', x: 200, y: 200, emoji: '🔑', size: 30, isHidden: false,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle', 'Clé', '🔑');
            const entity = game.entities.find(e => e.id === 'cle');
            if (entity) entity.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', 'Vous avez trouvé une clé étrange.', [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'door', x: 400, y: 100, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.loadLevel(1);
          }
        },
        {
          id: 'guardian', x: 400, y: 300, emoji: '👤', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle')) {
              game.dialogue.show('Gardien', "Je ne parle qu'à ceux qui ont la clé.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.dialogue.show('Gardien', 'Oh, vous avez la clé !', [
                {
                  label: 'Donner la clé',
                  callback: () => {
                    game.inventory.removeItem('cle');
                    const guardian = game.entities.find(e => e.id === 'guardian');
                    if (guardian) guardian.isHidden = true;
                    const door = game.entities.find(e => e.id === 'door');
                    if (door) door.isHidden = false;
                    game.dialogue.show('Gardien', 'Vous pouvez passer.', [{ label: 'Fermer', callback: null }]);
                  }
                },
                { label: 'Garder la clé', callback: null }
              ]);
            }
          }
        }
      ]
    };
  }

  createLevel1(): Level {
    return {
      spawn: { x: 400, y: 400 },
      drawBackground: (ctx, width, height) => {
        // Sol urbain (béton)
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, width, height);

        // La Mer (en bas)
        ctx.fillStyle = '#006699';
        ctx.fillRect(0, 450, width, 150);
        ctx.fillStyle = '#0088cc';
        ctx.font = '30px Arial';
        ctx.fillText('🌊', 100, 500);
        ctx.fillText('🌊', 300, 520);
        ctx.fillText('🌊', 500, 480);
        ctx.fillText('🌊', 700, 510);

        // Le Mur (en haut)
        ctx.fillStyle = '#8B4513'; // Briques
        ctx.fillRect(100, 50, 600, 100);
        ctx.fillStyle = '#A0522D';
        for(let i=100; i<700; i+=40) {
          ctx.fillRect(i, 50, 38, 20);
          ctx.fillRect(i-20, 72, 38, 20);
          ctx.fillRect(i, 94, 38, 20);
          ctx.fillRect(i-20, 116, 38, 20);
        }
      },
      entities: [
        // Objets à récupérer
        {
          id: 'eye', x: 50, y: 300, emoji: '👁️', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_regard', 'Clé du regard', '👁️');
            const e = game.entities.find(e => e.id === 'eye');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Tu peux maintenant voir ce qui était caché.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'brush', x: 400, y: 250, emoji: '🖌️', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_expression', 'Clé de l\'expression', '🖌️');
            const e = game.entities.find(e => e.id === 'brush');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Tu peux maintenant comprendre le message de l'artiste.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'vest', x: 750, y: 300, emoji: '🦺', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_realite', 'Clé de la réalité', '🦺');
            const e = game.entities.find(e => e.id === 'vest');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Tu peux maintenant révéler ce que cache la mer.", [{ label: 'Fermer', callback: null }]);
          }
        },
        // Points d'interaction
        {
          id: 'wall', x: 200, y: 100, emoji: '🧱', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_regard')) {
              const eye = game.entities.find(e => e.id === 'eye');
              if (eye) eye.isHidden = false;
              game.dialogue.show('Le Mur', "Ce mur semble vide… mais ton regard semble attirer quelque chose. Une clé du regard est apparue !", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_regard');
              if (!game.inventory.hasItem('indice_mur')) {
                game.inventory.addItem('indice_mur', 'Indice : Invisibilisation', '🧱');
              }
              game.dialogue.show('Le Mur', "Quelque chose a été effacé… L’art révèle ce que l’Europe préfère parfois cacher : certaines réalités, comme les migrants ou les injustices, sont invisibilisées.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        {
          id: 'art', x: 400, y: 100, emoji: '🎨', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_expression')) {
              const brush = game.entities.find(e => e.id === 'brush');
              if (brush) brush.isHidden = false;
              game.dialogue.show('L\'Art', "Tu vois l’œuvre… mais tu ne comprends pas son message. Une clé de l'expression est apparue !", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_expression');
              if (!game.inventory.hasItem('indice_banksy')) {
                game.inventory.addItem('indice_banksy', 'Indice : Banksy', '🎨');
              }
              game.dialogue.show('L\'Art', "Banksy utilise l’art pour dénoncer les injustices. Ses œuvres montrent les migrants, les frontières et les contradictions de l’Europe. Il critique le manque de solidarité.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        {
          id: 'sea', x: 600, y: 500, emoji: '🌊', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_realite')) {
              const vest = game.entities.find(e => e.id === 'vest');
              if (vest) vest.isHidden = false;
              game.dialogue.show('La Mer', "La mer reste silencieuse… mais un objet flotte au loin. Une clé de la réalité est apparue !", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_realite');
              if (!game.inventory.hasItem('indice_weiwei')) {
                game.inventory.addItem('indice_weiwei', 'Indice : Ai Weiwei', '🌊');
              }
              game.dialogue.show('La Mer', "Ce gilet n’est pas un simple objet… Il représente les migrants et les dangers qu’ils traversent. Ai Weiwei utilise des objets réels pour rendre la crise concrète. Derrière les chiffres, il y a des vies humaines.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        // Sortie
        {
          id: 'door1', x: 400, y: 30, emoji: '🚪', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (game.inventory.hasItem('indice_mur') && game.inventory.hasItem('indice_banksy') && game.inventory.hasItem('indice_weiwei')) {
              game.dialogue.show('Porte de sortie', "Tu as compris que l’Europe est pleine de contradictions… L’art permet de révéler, critiquer et faire réfléchir.", [
                {
                  label: 'Passer au niveau 2',
                  callback: () => {
                    game.loadLevel(2);
                  }
                }
              ]);
            } else {
              game.dialogue.show('Porte de sortie', "Il te manque encore des indices…", [{ label: 'Fermer', callback: null }]);
            }
          }
        }
      ]
    };
  }

  createLevel2(): Level {
    return {
      spawn: { x: 400, y: 550 },
      drawBackground: (ctx, width, height) => {
        // Sol en marbre (Cité de l'Ordre)
        const tileSize = 40;
        for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
            ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#e0e0e0' : '#ffffff';
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
        // Tapis rouge central de l'autorité
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(300, 0, 200, height);

        // Zone d'ombre (Musée de l'ombre) en bas à gauche
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 400, 250, 200);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.fillText('Zone Condamnée', 125, 430);
      },
      entities: [
        {
          id: 'official_art', x: 400, y: 120, emoji: '🏛️', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Plaque Officielle', "Ziegler - Les Quatre Éléments. Cette œuvre vise à rendre le pouvoir évident et incontestable par la normalisation des corps et l'héroïsation du collectif.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'commissaire', x: 400, y: 250, emoji: '👮', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('dix_art')) {
              game.dialogue.show('Commissaire à la Culture', "L'art moderne est une maladie. Notre art officiel est la véritable mise en scène de l'autorité. Si vous cherchez autre chose, regardez vers la zone condamnée.", [
                {
                  label: 'Fermer',
                  callback: () => {
                    const wall = game.entities.find(e => e.id === 'suspicious_wall');
                    if (wall) wall.isHidden = false;
                  }
                }
              ]);
            } else {
              game.dialogue.show('Commissaire à la Culture', "Qu'est-ce que cette corruption moderne ?! Allez-vous choisir l'adhésion par notre esthétique séduisante, ou cette liberté critique qui dérange ?", [
                {
                  label: 'Défendre la liberté critique',
                  callback: () => {
                    game.inventory.removeItem('dix_art');
                    const comm = game.entities.find(e => e.id === 'commissaire');
                    if (comm) comm.isHidden = true;
                    const door = game.entities.find(e => e.id === 'door2');
                    if (door) door.isHidden = false;
                    game.dialogue.show('Commissaire à la Culture', "Argh ! Votre subjectivité et votre doute brisent notre propagande !", [{ label: 'Fermer', callback: null }]);
                  }
                },
                { label: 'Se soumettre à l\'Ordre', callback: null }
              ]);
            }
          }
        },
        {
          id: 'suspicious_wall', x: 250, y: 450, emoji: '🧱', size: 40, isHidden: true,
          onInteract: (game: Game) => {
            const wall = game.entities.find(e => e.id === 'suspicious_wall');
            if (wall) wall.isHidden = true;
            const art = game.entities.find(e => e.id === 'degenerate_art');
            if (art) art.isHidden = false;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez trouvé une entrée cachée vers le Musée de l'Ombre.", [{ label: 'Entrer', callback: null }]);
          }
        },
        {
          id: 'degenerate_art', x: 100, y: 500, emoji: '🎨', size: 40, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('dix_art', 'Otto Dix - La Guerre', '🎨');
            const art = game.entities.find(e => e.id === 'degenerate_art');
            if (art) art.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous récupérez une œuvre d'art dégénéré.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'door2', x: 400, y: 40, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.loadLevel(3);
          }
        }
      ]
    };
  }

  createLevel3(): Level {
    return {
      spawn: { x: 400, y: 500 },
      drawBackground: (ctx, width, height) => {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#444';
        ctx.font = '20px Arial';
        ctx.fillText('Niveau 3 . Humanisme Européen . Université Catholique de Lille', 150, 30);
      },
      entities: [
        {
          id: 'censure_zone_1', x: 200, y: 200, emoji: '🚫', size: 40, isHidden: false,
          onInteract: (game: Game) => {}
        },
        {
          id: 'censure_zone_2', x: 600, y: 200, emoji: '🚫', size: 40, isHidden: false,
          onInteract: (game: Game) => {}
        },
        {
          id: 'censure_zone_3', x: 200, y: 400, emoji: '🚫', size: 40, isHidden: false,
          onInteract: (game: Game) => {}
        },
        {
          id: 'cle_parole', x: 100, y: 400, emoji: '🗣️', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_parole', 'Clé de la parole', '🗣️');
            const e = game.entities.find(e => e.id === 'cle_parole');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Clé de la parole obtenue. Tu peux maintenant lire ce qui a été interdit.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'cle_regard', x: 400, y: 400, emoji: '👁️', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_regard', 'Clé du regard', '👁️');
            const e = game.entities.find(e => e.id === 'cle_regard');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Clé du regard obtenue. Tu peux maintenant voir ce que la caricature dissimule.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'cle_resistance', x: 700, y: 400, emoji: '✊', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('cle_resistance', 'Clé de la résistance', '✊');
            const e = game.entities.find(e => e.id === 'cle_resistance');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Clé de la résistance obtenue. Tu peux maintenant entendre ce que la pièce murmure.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'mur_censure', x: 150, y: 150, emoji: '🧱', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_parole')) {
              const cle = game.entities.find(e => e.id === 'cle_parole');
              if (cle) cle.isHidden = false;
              game.dialogue.show('Le Mur Censure', "Des mots ont été effacés ici. Il semble qu'une clé soit nécessaire pour lire ce qui a été interdit.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_parole');
              if (!game.inventory.hasItem('indice1')) {
                game.inventory.addItem('indice1', 'Indice : Censure', '🧱');
              }
              game.dialogue.show('Le Mur Censure', "Des mots ont été effacés ici. Des œuvres ont été interdites, des artistes poursuivis. La censure ne détruit pas seulement une œuvre - elle tente d'effacer une pensée.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        {
          id: 'affiche_satirique', x: 400, y: 150, emoji: '🖼️', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_regard')) {
              const cle = game.entities.find(e => e.id === 'cle_regard');
              if (cle) cle.isHidden = false;
              game.dialogue.show('Affiche Satirique', "Tu vois un dessin bizarre... mais tu n'en comprends pas le message. Il te faut la clé du regard.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_regard');
              if (!game.inventory.hasItem('indice2')) {
                game.inventory.addItem('indice2', 'Indice : Satire', '🖼️');
              }
              game.dialogue.show('Affiche Satirique', "George Grosz utilise la caricature pour dénoncer les élites corrompues de son époque. Militaires, politiciens, industriels : tous représentés comme des figures grotesques. Ses œuvres lui ont valu des procès et finalement l'exil.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        {
          id: 'scene_theatre', x: 650, y: 150, emoji: '🎭', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('cle_resistance')) {
              const cle = game.entities.find(e => e.id === 'cle_resistance');
              if (cle) cle.isHidden = false;
              game.dialogue.show('Scène de Théâtre', "Une scène de théâtre ordinaire... Des personnages qui parlent, rien de plus. Il te faut la clé de la résistance.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.inventory.removeItem('cle_resistance');
              if (!game.inventory.hasItem('indice3')) {
                game.inventory.addItem('indice3', 'Indice : Résistance', '🎭');
              }
              game.dialogue.show('Scène de Théâtre', "Dans Rhinocéros, Ionesco montre comment une société entière peut se soumettre à la pensée unique. Un à un, les personnages se transforment - sauf un. L'absurde devient une arme : quand on ne peut pas critiquer directement, la métaphore prend le relais.", [{ label: 'Compris', callback: null }]);
            }
          }
        },
        {
          id: 'door_sortie', x: 400, y: 50, emoji: '🚪', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (game.inventory.hasItem('indice1') && game.inventory.hasItem('indice2') && game.inventory.hasItem('indice3')) {
              game.dialogue.show('Porte de Sortie', "Tu as compris que la censure ne fait pas taire l'art - elle le pousse à se réinventer. L'humanisme européen repose sur un droit fondamental : penser, créer et critiquer librement.", [
                {
                  label: 'Passer au niveau 4',
                  callback: () => {
                    game.loadLevel(4);
                  }
                }
              ]);
            } else {
              game.dialogue.show('Porte de Sortie', "Il te manque encore des indices... Retourne explorer la salle.", [{ label: 'Fermer', callback: null }]);
            }
          }
        }
      ]
    };
  }

  createLevel4(): Level {
    return {
      spawn: { x: 100, y: 500 },
      drawBackground: (ctx, width, height) => {
        // Bureau de douane
        ctx.fillStyle = '#e0e0e0'; // Gris plus clair
        ctx.fillRect(0, 0, width, height);

        // Paperasse au sol (Statique)
        ctx.fillStyle = '#fff';
        const seed = 12345;
        let x = seed;
        for (let i = 0; i < 20; i++) {
          x = (x * 16807) % 2147483647;
          const posX = x % width;
          x = (x * 16807) % 2147483647;
          const posY = x % height;
          ctx.fillRect(posX, posY, 15, 20);
        }

        // Machine à café bruyante
        ctx.fillStyle = '#333';
        ctx.fillRect(650, 450, 40, 60);
        ctx.fillStyle = '#555';
        ctx.fillRect(655, 460, 30, 20);
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Courier New';
        ctx.fillText('VROOOOOOOOM (Machine à café)', 600, 530);
      },
      entities: [
        {
          id: 'archiviste', x: 400, y: 300, emoji: '👴', size: 45, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            game.dialogue.show('L\'Archiviste Fou', "Bienvenue au bureau de douane ! Pour passer, il me faut la destination de la grande diagonale européenne qui part de San Marino. C'est une ville... particulière.", [
              {
                label: 'C\'est Paris ?',
                callback: () => {
                  game.dialogue.show('L\'Archiviste Fou', "Nul ! C'est moins de kilomètres que le trajet de Massimo Bonini pour aller à l'entraînement !", [{ label: 'Oups', callback: null }]);
                }
              },
              {
                label: 'C\'est Berlin ?',
                callback: () => {
                  game.dialogue.show('L\'Archiviste Fou', "Nul ! C'est moins de kilomètres que le trajet de Massimo Bonini pour aller à l'entraînement !", [{ label: 'Oups', callback: null }]);
                }
              },
              {
                label: 'Je vais chercher...',
                callback: () => {
                  game.progress['talkedToArchiviste'] = true;
                }
              }
            ]);
          }
        },
        {
          id: 'poster', x: 100, y: 100, emoji: '🏃', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Poster de Kozakiewicz', "Pour trouver la ville, cherche celle qui est à la lisière de la Biélorussie, là où les frontières s'estompent.", [{ label: 'Noté', callback: null }]);
          }
        },
        {
          id: 'lamp', x: 600, y: 100, emoji: '💡', size: 35, isHidden: true,
          onInteract: (game: Game) => {
            game.progress['lampMoved'] = !game.progress['lampMoved'];
            game.state = GameState.DIALOGUE;
            const msg = game.progress['lampMoved'] ? "Vous déplacez la lampe vers la carte du Danemark." : "Vous remettez la lampe à sa place.";
            game.dialogue.show('Lampe de bureau', msg, [{ label: 'Ok', callback: null }]);
          }
        },
        {
          id: 'map_denmark', x: 700, y: 100, emoji: '🗺️', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            const lamp = game.entities.find(e => e.id === 'lamp');
            if (lamp) lamp.isHidden = false;
            if (game.progress['lampMoved']) {
              game.dialogue.show('Carte du Danemark', "La lumière révèle un message : 'Le premier caractère est un S avec un crochet (Š). On l'appelle la ville-carrefour'.", [{ label: 'Intéressant', callback: null }]);
            } else {
              game.dialogue.show('Carte du Danemark', "Une carte ordinaire du Danemark. Il fait un peu sombre ici. Peut-être qu'une lampe aiderait ?", [{ label: 'Fermer', callback: null }]);
            }
          }
        },
        {
          id: 'terminal', x: 400, y: 100, emoji: '🖥️', size: 45, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            game.dialogue.promptInput('Vieux Terminal', 'DESTINATION : _', (value) => {
              const val = value.trim().toUpperCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprime les accents pour la comparaison
              
              if (val === 'SALCININKAI') {
                game.progress['barrierOpen'] = true;
                game.state = GameState.DIALOGUE;
                game.dialogue.show('L\'Archiviste Fou', "INCROYABLE ! *Danse ridicule* Bon voyage en Lituanie !", [
                  {
                    label: 'Partir',
                    callback: () => {
                      game.particles.emit(400, 300, 50, '#ff00ff'); // Confettis restaurés
                      const arch = game.entities.find(e => e.id === 'archiviste');
                      if (arch) arch.isHidden = true;
                      const barrier = game.entities.find(e => e.id === 'barrier');
                      if (barrier) barrier.isHidden = true;
                      const door = game.entities.find(e => e.id === 'door4');
                      if (door) door.isHidden = false;
                    }
                  }
                ]);
              } else {
                game.progress['terminal_fails'] = (game.progress['terminal_fails'] || 0) + 1;
                game.state = GameState.DIALOGUE;
                let msg = "ERREUR : DESTINATION INCONNUE.";
                if (game.progress['terminal_fails'] >= 2) {
                  msg += " (Indice : La réponse est ŠALČININKAI)";
                }
                game.dialogue.show('Vieux Terminal', msg, [{ label: 'Réessayer', callback: null }]);
              }
            });
          }
        },
        {
          id: 'barrier', x: 400, y: 20, emoji: '🚧', size: 60, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Barrière de Douane', "La barrière est fermée. Le terminal doit être configuré.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'door4', x: 400, y: 20, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.loadLevel(5);
          }
        }
      ]
    };
  }

  createLevel5(): Level {
    return {
      spawn: { x: 400, y: 550 },
      drawBackground: (ctx, width, height) => {
        // Fond général
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Lieu A : Bibliothèque Ancienne (Haut Gauche)
        ctx.fillStyle = '#3e2723'; // Marron foncé
        ctx.fillRect(50, 50, 250, 200);
        ctx.fillStyle = '#5d4037';
        for(let i=0; i<4; i++) {
            ctx.fillRect(60, 80 + i*40, 230, 10);
        }
        ctx.fillStyle = '#d7ccc8';
        ctx.font = '16px Arial';
        ctx.fillText('Bibliothèque Ancienne', 175, 70);

        // Lieu B : Galerie Sombre (Haut Droite)
        ctx.fillStyle = '#000000';
        ctx.fillRect(500, 50, 250, 200);
        // Clair-obscur effect
        const gradient = ctx.createRadialGradient(625, 150, 10, 625, 150, 100);
        gradient.addColorStop(0, 'rgba(255, 200, 100, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(500, 50, 250, 200);
        ctx.fillStyle = '#ffcc80';
        ctx.fillText('Galerie Sombre', 625, 70);

        // Emojis descriptifs du tableau
        ctx.font = '24px Arial';
        ctx.fillText('✨', 550, 110);
        ctx.fillText('🙏', 700, 110);
        ctx.fillText('👗', 550, 190);
        ctx.fillText('😇', 700, 190);
        ctx.fillText('🕯️', 625, 210);
        ctx.fillText('😭', 625, 100);

        // Lieu C : Pupitre de l'Érudit (Bas Centre)
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(300, 350, 200, 150);
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(320, 380, 40, 50); // Manuscrit
        ctx.fillRect(380, 390, 50, 40); // Manuscrit
        ctx.fillStyle = '#d7ccc8';
        ctx.fillText('Pupitre de l\'Érudit', 400, 370);

        // Mur Blanc (Centre)
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(350, 200, 100, 100);
      },
      entities: [
        {
          id: 'genie', x: 400, y: 500, emoji: '🧞‍♂️', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            const b = game.entities.find(e => e.id === 'bibliotheque');
            const g = game.entities.find(e => e.id === 'galerie');
            const p = game.entities.find(e => e.id === 'pupitre');
            if (b) b.isHidden = false;
            if (g) g.isHidden = false;
            if (p) p.isHidden = false;
            game.dialogue.show('Génie de la Bibliothèque', "Bravo, vous avez atteint le seuil de la synthèse. Ici, le cœur et la raison doivent s'accorder. 📚 Allez à la Bibliothèque Ancienne pour commencer.", [{ label: 'Compris', callback: null }]);
          }
        },
        {
          id: 'bibliotheque', x: 175, y: 150, emoji: '📚', size: 50, isHidden: true,
          onInteract: (game: Game) => {
            if (!game.inventory.hasItem('indice1')) {
              game.inventory.addItem('indice1', 'Indice : Auto-transformation', '📚');
            }
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Bibliothèque Ancienne', "Pour stabiliser les fondations de l'Europe, il faut comprendre comment l'art et la pensée la construisent. C'est un véritable processus d'auto-transformation. 🖌️🪶 Visitez la Galerie Sombre et le Pupitre de l'Érudit.", [{ label: 'Chercher la suite', callback: null }]);
          }
        },
        {
          id: 'galerie', x: 625, y: 150, emoji: '🖼️', size: 50, isHidden: true,
          onInteract: (game: Game) => {
            if (!game.inventory.hasItem('indice1')) {
               game.state = GameState.DIALOGUE;
               game.dialogue.show('Galerie Sombre', "Il fait trop sombre pour comprendre cette œuvre. Visitez d'abord la Bibliothèque Ancienne.", [{ label: 'Fermer', callback: null }]);
               return;
            }
            if (!game.inventory.hasItem('indice2')) {
              game.inventory.addItem('indice2', 'Indice : Émotion & Clair-obscur', '🖼️');
            }
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Galerie Sombre', "Une femme au centre, un contraste violent entre ombre et lumière (clair-obscur), des vêtements en mouvement et un regard tourné vers le ciel. Est-ce une simple image ou une émotion qui transperce la toile ? N'oubliez pas le regard masculin qui cadre cette émotion. 🖌️", [{ label: 'Fascinant', callback: null }]);
          }
        },
        {
          id: 'pupitre', x: 400, y: 400, emoji: '✍️', size: 40, isHidden: true,
          onInteract: (game: Game) => {
            if (!game.inventory.hasItem('indice1')) {
               game.state = GameState.DIALOGUE;
               game.dialogue.show('Pupitre de l\'Érudit', "Des manuscrits illisibles sans le contexte de la Bibliothèque Ancienne.", [{ label: 'Fermer', callback: null }]);
               return;
            }
            if (!game.inventory.hasItem('indice3')) {
              game.inventory.addItem('indice3', 'Indice : Esprit critique', '✍️');
            }
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Pupitre de l\'Érudit', "Un homme qui a révolutionné l'Europe par sa plume 🪶. Il ne dirigeait pas d'armée, mais il utilisait l'humour et l'ironie pour dénoncer l'hypocrisie de l'Église et des rois. Pour lui, 'la Folie' est un personnage qui dit la vérité. C'est le triomphe de l'esprit critique.", [{ label: 'Intéressant', callback: null }]);
          }
        },
        {
          id: 'mur_blanc', x: 400, y: 250, emoji: '🧱', size: 60, isHidden: false,
          onInteract: (game: Game) => {
            if (!game.inventory.hasItem('indice2') || !game.inventory.hasItem('indice3')) {
              game.state = GameState.DIALOGUE;
              game.dialogue.show('Le Grand Mur Blanc', "Le mur attend que vous ayez saisi l'émotion de la Galerie et la pensée du Pupitre.", [{ label: 'Fermer', callback: null }]);
            } else {
              const askCharade2 = () => {
                game.state = GameState.DIALOGUE;
                game.dialogue.promptInput('Le Penseur', "1. Mon premier est le début d'une nouvelle époque géologique ou historique.\n2. Mon second rime avec asthme et évoque la respiration de l'esprit.", (value) => {
                  const val = value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  if (val === 'ERASME') {
                    game.particles.emit(400, 250, 100, '#ff0000');
                    game.particles.emit(400, 250, 100, '#00ff00');
                    game.particles.emit(400, 250, 100, '#0000ff');
                    game.state = GameState.DIALOGUE;
                    game.dialogue.show('Le Mur Blanc', "Vous avez réuni l'émotion et la pensée. L'Europe n'est plus une statue de pierre, mais une œuvre vivante dont vous êtes maintenant l'un des auteurs. 📚🖌️🪶", [
                      {
                        label: 'Franchir la porte finale',
                        callback: () => {
                          const d = game.entities.find(e => e.id === 'doorEnd');
                          if (d) d.isHidden = false;
                        }
                      }
                    ]);
                  } else {
                    game.progress['charade2Fails'] = (game.progress['charade2Fails'] || 0) + 1;
                    if (game.progress['charade2Fails'] >= 2) {
                      game.state = GameState.DIALOGUE;
                      game.dialogue.show('Indice Mystérieux', "🐈 Vous semblez bloqué... La réponse est ÉRASME.", [
                        { label: 'Inscrire ÉRASME', callback: () => {
                            game.particles.emit(400, 250, 100, '#ff0000');
                            game.particles.emit(400, 250, 100, '#00ff00');
                            game.particles.emit(400, 250, 100, '#0000ff');
                            game.state = GameState.DIALOGUE;
                            game.dialogue.show('Le Mur Blanc', "Vous avez réuni l'émotion et la pensée. L'Europe n'est plus une statue de pierre, mais une œuvre vivante dont vous êtes maintenant l'un des auteurs. 📚🖌️🪶", [
                              {
                                label: 'Franchir la porte finale',
                                callback: () => {
                                  const d = game.entities.find(e => e.id === 'doorEnd');
                                  if (d) d.isHidden = false;
                                }
                              }
                            ]);
                        }}
                      ]);
                    } else {
                      game.state = GameState.DIALOGUE;
                      game.dialogue.show('Le Mur Blanc', "Les lettres s'effacent... Ce n'est pas le bon nom.", [
                        { label: 'Réessayer', callback: askCharade2 },
                        { label: 'Donner sa langue au chat 🐈', callback: () => {
                            game.audio.playBeep(200, 0.3);
                            setTimeout(() => game.audio.playBeep(150, 0.3), 300);
                            setTimeout(() => game.audio.playBeep(100, 0.6), 600);
                            game.dialogue.show('Indice Mystérieux', "🐈 C'est un nom qui commence comme une Ère et finit dans un souffle.", [
                              { label: 'Réessayer', callback: askCharade2 }
                            ]);
                        }}
                      ]);
                    }
                  }
                });
              };

              const askCharade1 = () => {
                game.state = GameState.DIALOGUE;
                game.dialogue.promptInput('Le Sujet de l\'Art', "1. Mon second est le prénom de la figure chrétienne la plus célèbre.\n2. Mon premier se déguste souvent à l'heure du goûter. (Indice : Gâteau préféré de Proust)", (value) => {
                  const val = value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
                  if (val.includes('MARIEMADELEINE') || val.includes('MADELEINEMARIE') || val.includes('SAINTEMARIEMADELEINE')) {
                    game.progress['charade1Solved'] = true;
                    game.particles.emit(400, 250, 80, '#ffffff');
                    askCharade2();
                  } else {
                    game.progress['charade1Fails'] = (game.progress['charade1Fails'] || 0) + 1;
                    if (game.progress['charade1Fails'] >= 2) {
                      game.state = GameState.DIALOGUE;
                      game.dialogue.show('Indice Mystérieux', "🐈 Vous semblez bloqué... La réponse est MARIE MADELEINE.", [
                        { label: 'Inscrire MARIE MADELEINE', callback: () => {
                            game.progress['charade1Solved'] = true;
                            game.particles.emit(400, 250, 80, '#ffffff');
                            askCharade2();
                        }}
                      ]);
                    } else {
                      game.state = GameState.DIALOGUE;
                      game.dialogue.show('Le Mur Blanc', "Les lettres s'effacent... Ce n'est pas le bon nom.", [
                        { label: 'Réessayer', callback: askCharade1 },
                        { label: 'Donner sa langue au chat 🐈', callback: () => {
                            game.audio.playBeep(200, 0.3);
                            setTimeout(() => game.audio.playBeep(150, 0.3), 300);
                            setTimeout(() => game.audio.playBeep(100, 0.6), 600);
                            game.dialogue.show('Indice Mystérieux', "🐈 C'est une figure de lumière dont le nom inverse l'ordre de la charade. Elle pleure dans le clair-obscur...", [
                              { label: 'Réessayer', callback: askCharade1 }
                            ]);
                        }}
                      ]);
                    }
                  }
                });
              };

              if (game.progress['charade1Solved']) {
                askCharade2();
              } else {
                askCharade1();
              }
            }
          }
        },
        {
          id: 'doorEnd', x: 400, y: 100, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.state = GameState.ENDING;
            game.creditsScrollY = game.canvas.height;
          }
        }
      ]
    };
  }

  interact() {
    const interactable = this.entities
      .filter(e => !e.isHidden)
      .filter(e => Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.size * 1.5);

    if (interactable.length === 0) return;

    // Trier par distance, mais donner la priorité absolue aux portes si on est vraiment dessus
    interactable.sort((a, b) => {
      const distA = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      const distB = Math.hypot(b.x - this.player.x, b.y - this.player.y);

      const isDoorA = a.emoji === '🚪' && distA < a.size;
      const isDoorB = b.emoji === '🚪' && distB < b.size;
      
      if (isDoorA && !isDoorB) return -1;
      if (!isDoorA && isDoorB) return 1;

      return distA - distB;
    });

    interactable[0].onInteract(this);
  }

  update() {
    if (this.state === GameState.TRANSITION) return;
    this.particles.update();
    if (this.state === GameState.ENDING) {
      this.inventory.hide();
      this.dialogue.hideWithoutCallback();
      document.getElementById('inventory-ui')?.classList.add('hidden');
      document.getElementById('dialogue-ui')?.classList.add('hidden');
      this.endingTimer++;
      if (this.endingTimer > 120) { // 2 secondes à 60fps
        this.creditsScrollY -= 1;
      }
      return;
    }
    if (this.state !== GameState.PLAYING) return;

    if (this.currentLevelIndex === 3) {
      this.updateLevel3();
    }

    let dx = 0, dy = 0;
    if (this.keys['ArrowUp'] || this.keys['z']) dy = -1;
    if (this.keys['ArrowDown'] || this.keys['s']) dy = 1;
    if (this.keys['ArrowLeft'] || this.keys['q']) dx = -1;
    if (this.keys['ArrowRight'] || this.keys['d']) dx = 1;

    if (dx !== 0 || dy !== 0) {
      if (Math.random() < 0.1) {
        this.particles.emit(this.player.x, this.player.y, 1, '#ffffff');
      }
    }

    this.player.move(dx, dy, this.canvas.width, this.canvas.height);
  }

  updateLevel3() {
    const zones = this.entities.filter(e => e.id.startsWith('censure_zone_'));
    const time = Date.now() * 0.0019;
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      // Trajectoires différentes pour les 4 zones
      const offset = i * (Math.PI / 2);
      zone.x = 400 + Math.cos(time + offset) * 250;
      zone.y = 300 + Math.sin(time + offset) * 150;
      
      if (Math.hypot(zone.x - this.player.x, zone.y - this.player.y) < zone.size) {
        this.player.x = this.currentLevel.spawn.x;
        this.player.y = this.currentLevel.spawn.y;
        this.audio.play('error');
        
        // Réinitialiser les clés
        this.inventory.removeItem('cle_parole');
        this.inventory.removeItem('cle_regard');
        this.inventory.removeItem('cle_resistance');
        
        // Cacher les clés
        const keys = ['cle_parole', 'cle_regard', 'cle_resistance'];
        keys.forEach(k => {
          const e = this.entities.find(e => e.id === k);
          if (e) e.isHidden = true;
        });

        this.state = GameState.DIALOGUE;
        this.dialogue.show('Censure', "Tu as été censuré ! Les clés ont été confisquées, retour au début.", [{ label: 'Fermer', callback: null }]);
      }
    }
  }

  draw() {
    if (this.currentLevel) {
      this.currentLevel.drawBackground(this.ctx, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Dessiner les entités normales d'abord
    this.entities.filter(e => !e.isHidden && e.emoji !== '🚪').forEach(e => {
      this.ctx.fillText(e.emoji, e.x, e.y);
    });

    // Dessiner les portes par-dessus tout le reste pour faciliter le clic
    this.entities.filter(e => !e.isHidden && e.emoji === '🚪').forEach(e => {
      this.ctx.fillText(e.emoji, e.x, e.y);
    });

    // Joueur
    this.ctx.fillText(this.player.emoji, this.player.x, this.player.y);
    
    this.particles.draw(this.ctx);

    if (this.state === GameState.TRANSITION) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.state === GameState.ENDING) {
      this.ctx.fillStyle = 'black';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.endingTimer <= 120) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '50px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Fin', this.canvas.width / 2, this.canvas.height / 2);
      } else {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        const credits = [
          'Clément Vasseur - FMMS',
          'Améline Mayeux - FMMS',
          'Alyha Tebri - FMMS',
          'Hélie Hubben - FMMS',
          'Jean Wiart - FGES'
        ];
        credits.forEach((name, i) => {
          this.ctx.fillText(name, this.canvas.width / 2, this.canvas.height + this.creditsScrollY + i * 40);
        });
      }
    }
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}
