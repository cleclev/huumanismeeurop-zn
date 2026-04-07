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
            this.state = GameState.PLAYING;
          }
        };
        fadeOut();
      }
    };
    animateTransition();
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
      spawn: { x: 400, y: 500 },
      drawBackground: (ctx, width, height) => {
        const tileSize = 80;
        for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
            ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#5c2a21' : '#4a2018';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#30100a';
            ctx.strokeRect(x, y, tileSize, tileSize);
          }
        }
        // Piliers et torches
        ctx.fillStyle = '#111';
        
        ctx.fillRect(150, 150, 60, 60);
        ctx.font = '40px Arial';
        ctx.fillText('🔥', 180, 140);

        ctx.fillRect(590, 150, 60, 60);
        ctx.fillText('🔥', 620, 140);
      },
      entities: [
        {
          id: 'goya', x: 100, y: 400, emoji: '🖼️', size: 30, isHidden: false,
          onInteract: (game: Game) => {
            game.inventory.addItem('goya', 'Goya - La Raison', '🖼️');
            const entity = game.entities.find(e => e.id === 'goya');
            if (entity) entity.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez sauvé l'œuvre 'Le sommeil de la raison engendre des monstres' de Goya !", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'door1', x: 400, y: 50, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.loadLevel(2);
          }
        },
        {
          id: 'inquisitor', x: 400, y: 200, emoji: '🧙‍♂️', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.state = GameState.DIALOGUE;
            if (!game.inventory.hasItem('goya')) {
              game.dialogue.show('Grand Inquisiteur', "L'art non contrôlé pervertit l'âme. L'Encyclopédie doit brûler. Cherchez la lumière du dogme, pas celle de la raison.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.dialogue.show('Grand Inquisiteur', "Que cachez-vous là ? Une œuvre interdite ?", [
                {
                  label: 'Lui montrer la toile de Goya',
                  callback: () => {
                    game.inventory.removeItem('goya');
                    const inq = game.entities.find(e => e.id === 'inquisitor');
                    if (inq) inq.isHidden = true;
                    const door = game.entities.find(e => e.id === 'door1');
                    if (door) door.isHidden = false;
                    game.dialogue.show('Grand Inquisiteur', "Argh ! L'esprit critique m'aveugle !", [{ label: 'Fermer', callback: null }]);
                  }
                },
                { label: 'Ne rien dire', callback: null }
              ]);
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
      spawn: { x: 400, y: 550 },
      drawBackground: (ctx, width, height) => {
        // Fond "Cité du Flux" : Serveurs et bruit numérique
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, width, height);
        
        // Flux de données (lignes verticales)
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        for (let i = 0; i < width; i += 80) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }

        // Bruit visuel (Censure douce)
        ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
        ctx.fillRect(100, 100, 200, 150);
        ctx.fillRect(500, 300, 200, 150);
        ctx.fillRect(200, 400, 150, 100);
        
        ctx.fillStyle = '#00ffcc';
        ctx.font = '20px Arial';
        ctx.fillText('LA CITÉ DU FLUX', 400, 30);
      },
      entities: [
        {
          id: 'boss_algo', x: 400, y: 100, emoji: '🤖', size: 50, isHidden: false,
          onInteract: (game: Game) => {
            if (game.progress['resistedFlux'] || (game.inventory.hasItem('athens') && game.inventory.hasItem('rome') && game.inventory.hasItem('jerusalem'))) {
              game.state = GameState.DIALOGUE;
              game.dialogue.show('L\'Algorithme', "Impossible ! Tu as réuni les piliers de la conscience humaine... Ton individualité résiste à mon flux. La porte est ouverte.", [
                {
                  label: 'Reprendre forme humaine',
                  callback: () => {
                    game.progress['resistedFlux'] = true;
                    game.player.emoji = '🧑🎨';
                    const door = game.entities.find(e => e.id === 'door3');
                    if (door) door.isHidden = false;
                    game.inventory.removeItem('athens');
                    game.inventory.removeItem('rome');
                    game.inventory.removeItem('jerusalem');
                  }
                }
              ]);
            } else {
              game.progress['talkedToRobot'] = true;
              game.player.emoji = '🦏';
              game.state = GameState.DIALOGUE;
              game.dialogue.show('L\'Algorithme', "Tu es prévisible. Ta rhinocérisation est imminente. Tu es maintenant un rhinocéros.", [
                {
                  label: 'Fermer',
                  callback: () => {
                    const rhino = game.entities.find(e => e.id === 'rhino1');
                    if (rhino) rhino.isHidden = false;
                  }
                }
              ]);
            }
          }
        },
        {
          id: 'rhino1', x: 200, y: 400, emoji: '🦏', size: 40, isHidden: true,
          onInteract: (game: Game) => {
            game.progress['talkedToRhino'] = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Citoyen Rhinocérisé', "Rejoins le troupeau ! Les piliers apparaissent !", [
              {
                label: 'Fermer',
                callback: () => {
                  const r1 = game.entities.find(e => e.id === 'relic_athens');
                  const r2 = game.entities.find(e => e.id === 'relic_rome');
                  const r3 = game.entities.find(e => e.id === 'relic_jerusalem');
                  if (r1) r1.isHidden = false;
                  if (r2) r2.isHidden = false;
                  if (r3) r3.isHidden = false;
                }
              }
            ]);
          }
        },
        {
          id: 'relic_athens', x: 150, y: 150, emoji: '🦉', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('athens', "Chouette d'Athènes", '🦉');
            const e = game.entities.find(e => e.id === 'relic_athens');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez trouvé la Chouette d'Athènes.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'relic_rome', x: 400, y: 250, emoji: '📜', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('rome', 'Code de Rome', '📜');
            const e = game.entities.find(e => e.id === 'relic_rome');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez trouvé le Code de Rome.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'relic_jerusalem', x: 650, y: 150, emoji: '🕯️', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.inventory.addItem('jerusalem', 'Flambeau de Jérusalem', '🕯️');
            const e = game.entities.find(e => e.id === 'relic_jerusalem');
            if (e) e.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez trouvé le Flambeau de Jérusalem.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'door3', x: 400, y: 30, emoji: '🚪', size: 60, isHidden: true,
          onInteract: (game: Game) => {
            game.loadLevel(4);
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
        ctx.fillStyle = '#d3d3d3'; // Gris bureau
        ctx.fillRect(0, 0, width, height);

        // Paperasse au sol (Statique)
        ctx.fillStyle = '#fff';
        const seed = 12345;
        let x = seed;
        for (let i = 0; i < 20; i++) {
          // Simple générateur de nombres pseudo-aléatoires déterministe
          x = (x * 16807) % 2147483647;
          const posX = x % width;
          x = (x * 16807) % 2147483647;
          const posY = x % height;
          ctx.fillRect(posX, posY, 15, 20);
        }

        // Drapeaux Européens mal accrochés
        ctx.fillStyle = '#003399';
        ctx.fillRect(50, 20, 60, 40);
        ctx.fillRect(700, 30, 60, 40);
        ctx.fillStyle = '#ffcc00';
        ctx.font = '10px Arial';
        ctx.fillText('★', 80, 45);
        ctx.fillText('★', 730, 55);

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
          id: 'lamp', x: 600, y: 100, emoji: '💡', size: 35, isHidden: false,
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
            if (game.progress['lampMoved']) {
              game.dialogue.show('Carte du Danemark', "La lumière révèle un message : 'Le premier caractère est un S avec un crochet (Š). On l'appelle la ville-carrefour'.", [{ label: 'Intéressant', callback: null }]);
            } else {
              game.dialogue.show('Carte du Danemark', "Une carte ordinaire du Danemark. Il fait un peu sombre ici.", [{ label: 'Fermer', callback: null }]);
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
        ctx.save();
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#dcdcdc';
        ctx.fillRect(100, 100, 50, 400);
        ctx.fillRect(650, 100, 50, 400);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 5;
        ctx.strokeRect(150, 100, 500, 300);
        ctx.fillStyle = '#000';
        ctx.fillRect(200, 150, 400, 200);
        ctx.fillStyle = '#0f0';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('...témoignage de vie...', 210, 180);
        ctx.restore();
      },
      entities: [
        {
          id: 'marie', x: 200, y: 250, emoji: '💃', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.progress['talkedToMarie'] = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Marie-Madeleine', "Je suis plus qu'une image dans un cadre. Cherchez le fragment de mon histoire derrière les colonnes.", [
              {
                label: 'Fermer',
                callback: () => {
                  const f = game.entities.find(e => e.id === 'fragment1');
                  if (f) f.isHidden = false;
                }
              }
            ]);
          }
        },
        {
          id: 'erasme', x: 600, y: 250, emoji: '🧠', size: 40, isHidden: false,
          onInteract: (game: Game) => {
            game.progress['talkedToErasme'] = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Érasme', "Voici le Miroir de la Folie. Trouvez le fragment de vérité caché dans les échafaudages.", [
              {
                label: 'Fermer',
                callback: () => {
                  const f = game.entities.find(e => e.id === 'fragment2');
                  if (f) f.isHidden = false;
                }
              }
            ]);
          }
        },
        {
          id: 'fragment1', x: 120, y: 450, emoji: '🧩', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.progress['hasFragment1'] = true;
            const f = game.entities.find(e => e.id === 'fragment1');
            if (f) f.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez récupéré un fragment d'histoire.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'fragment2', x: 670, y: 450, emoji: '🧩', size: 30, isHidden: true,
          onInteract: (game: Game) => {
            game.progress['hasFragment2'] = true;
            const f = game.entities.find(e => e.id === 'fragment2');
            if (f) f.isHidden = true;
            game.state = GameState.DIALOGUE;
            game.dialogue.show('Système', "Vous avez récupéré un fragment de vérité.", [{ label: 'Fermer', callback: null }]);
          }
        },
        {
          id: 'statue', x: 400, y: 450, emoji: '🗿', size: 80, isHidden: false,
          onInteract: (game: Game) => {
            if (!game.progress['hasFragment1'] || !game.progress['hasFragment2']) {
              game.state = GameState.DIALOGUE;
              game.dialogue.show('Statue de Pierre', "Je suis figée. Il me manque des récits pour m'animer.", [{ label: 'Fermer', callback: null }]);
            } else {
              game.state = GameState.DIALOGUE;
              game.dialogue.show('Statue de Pierre', "Vous avez rassemblé les récits. Voulez-vous m'injecter l'empathie ?", [
                {
                  label: 'Injecter de l\'empathie',
                  callback: () => {
                    game.particles.emit(400, 450, 50, '#ff00ff');
                    const d = game.entities.find(e => e.id === 'doorEnd');
                    if (d) d.isHidden = false;
                  }
                }
              ]);
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
      .filter(e => Math.hypot(e.x - this.player.x, e.y - this.player.y) < 100);

    if (interactable.length === 0) return;

    // Trier par distance, mais donner la priorité absolue aux portes
    interactable.sort((a, b) => {
      const isDoorA = a.emoji === '🚪';
      const isDoorB = b.emoji === '🚪';
      if (isDoorA && !isDoorB) return -1;
      if (!isDoorA && isDoorB) return 1;

      const distA = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      const distB = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      return distA - distB;
    });

    interactable[0].onInteract(this);
  }

  update() {
    if (this.state === GameState.TRANSITION) return;
    this.particles.update();
    if (this.state === GameState.ENDING) {
      this.endingTimer++;
      if (this.endingTimer > 120) { // 2 secondes à 60fps
        this.creditsScrollY -= 1;
      }
      return;
    }
    if (this.state !== GameState.PLAYING) return;

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
          'Jean Viart - FGES'
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
