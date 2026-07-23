import { Player, TeamPool } from './types';

// Planteles rivales cargados para el torneo (scouting con "Estadistica 7v7", spec 013).
// Son delegaciones que enfrenta Uruguay; se agregan como planteles elegibles para
// registrar estadisticas de ambos cuadros. Los numeros son de orden de lista
// (no son dorsales oficiales) y se pueden editar despues desde Gestionar planteles.

type RosterEntry = [firstName: string, lastName: string];

type ScoutingTeamDef = {
  id: string;
  name: string;
  roster: RosterEntry[];
};

const slugify = (value: string) => {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'jugador';
};

// Rosters transcriptos del listado oficial del torneo. En cada entrada,
// primero el/los nombre(s) y luego el/los apellido(s), ya separados para
// que la app muestre el apellido (mas reconocible para scouting).
const scoutingTeamDefs: ScoutingTeamDef[] = [
  {
    id: 'arg-masc',
    name: 'Argentina Masculino',
    roster: [
      ['Facundo Sergio', 'Valin'],
      ['Diego Sebastian', 'Nicolini'],
      ['Geronimo', 'Giovenale'],
      ['Nicolas Valentin', 'Reniero'],
      ['Federico Ramon', 'Calgaro'],
      ['David Emmanuel', 'Barrientos'],
      ['Pablo Alejandro', 'Pereyra'],
      ['Jonatan Alejandro', 'Mendoza'],
      ['Mauro Jose', 'Cracco'],
      ['Emanuel Nicolas', 'Diaz'],
      ['Fernando Mario Angel', 'Gauna'],
      ['Mauricio Emiliano', 'Ocampo'],
    ],
  },
  {
    id: 'arg-fem',
    name: 'Argentina Femenino',
    roster: [
      ['Marianela Yanel', 'Gromenida'],
      ['Jesica Anahi', 'Vega'],
      ['Antonela', 'Nuñez'],
      ['Ana Clara', 'Perea'],
      ['Maria Soledad', 'Coulleri'],
      ['Valentina', 'Agolti'],
      ['Aristela Marisol', 'Larocca'],
      ['Maria Evangelina', "S. D'Avila"],
      ['Mercedes Analia', 'Müller'],
      ['Daiana Belen', 'Benitez'],
      ['Maria Luz', 'Calgaro'],
      ['Gisela Maria Lujan', 'Gonzalez'],
    ],
  },
  {
    id: 'arg-master-masc',
    name: 'Argentina Master Masculino',
    roster: [
      ['Sergio Ramón', 'Agolti'],
      ['Marcos Daniel', 'Capeletti'],
      ['Pablo Ramón', 'Martínez'],
      ['Claudio Alejandro', 'Mendoza'],
      ['Oscar Antonio', 'Romero'],
      ['Diego Hernán', 'Stivanello'],
      ['Waldo Heber', 'Zampar'],
      ['Gabriel Fabián', 'Ziloni'],
      ['Jonatan Alejandro', 'Mendoza'],
      ['Diego Sebastian', 'Nicolini'],
    ],
  },
  {
    id: 'can-masc',
    name: 'Canadá Masculino',
    roster: [
      ['Raphael', 'Gagnon'],
      ['William', 'Duchesne'],
      ['Michael', 'Larouche'],
      ['Michael', 'Fafard'],
      ['David', 'Neron'],
      ['Zachary', 'Fafard'],
      ['Charles', 'Perron'],
      ['Antoine', 'Baril'],
      ['Tommy', 'Hovington'],
      ['Emile', 'Chapdelaine'],
    ],
  },
  {
    id: 'col-fem-1',
    name: 'Colombia Femenino 1',
    roster: [
      ['Rosario', 'Robles Moreno'],
      ['Deisy Constanza', 'Cañon Martínez'],
      ['Lizceth Lorena', 'Guerrero Carranza'],
      ['Paula Andrea', 'Zamora Moreno'],
      ['Keilly Julieth', 'Bejarano Cárdenas'],
      ['Lina Rocío', 'Perdomo Rodriguez'],
      ['María Lucía', 'Gómez Garzón'],
      ['Aura Natalie', 'Parra Martin'],
      ['Maria Alejandra', 'Diaz Muñoz'],
      ['Karen Tatiana', 'Moreno Lopez'],
      ['Laura Carolina', 'Sánchez Téllez'],
      ['Alejandra', 'Riaño Martinez'],
    ],
  },
  {
    id: 'col-fem-2',
    name: 'Colombia Femenino 2',
    roster: [
      ['Edith Marcela', 'Alarcón Malaver'],
      ['Nicoll Stefanía', 'Oyuela Bernal'],
      ['Daniela', 'Pallares Jerez'],
      ['Paula Juliana', 'Rodríguez Pardo'],
      ['Nicole Tatiana', 'Pérez Cepeda'],
      ['Yudy Tatiana', 'Moreno Puentes'],
      ['Sara Lucia', 'Perdomo Montoya'],
      ['Danna Sofia', 'Perdomo Montoya'],
      ['Sara Valentina', 'López Rodríguez'],
    ],
  },
  {
    id: 'col-masc-1',
    name: 'Colombia Masculino 1',
    roster: [
      ['Yurian', 'Rodríguez Álvarez'],
      ['Juan David', 'Díaz Marquez'],
      ['Santiago', 'Otálora Fajardo'],
      ['David Ricardo', 'Tellez Moreno'],
      ['Camilo', 'Torres Díaz'],
      ['Miguel Ángel', 'Martínez Torres'],
      ['Edgar Andrés', 'Molina Arias'],
      ['Cristian Daniel', 'Tovar Suárez'],
      ['Steban', 'Monsalve Parra'],
      ['Ariel', 'Virviescas García'],
      ['Joan Sebastián', 'Martín Cubillos'],
    ],
  },
  {
    id: 'col-masc-2',
    name: 'Colombia Masculino 2 (B)',
    roster: [
      ['Juan Felipe', 'López Ochoa'],
      ['Santiago', 'Vasquez'],
      ['Daniel', 'Peñaloza'],
      ['Juan', 'Sierra'],
      ['Manuel Andrés', 'González Piña'],
      ['Jonathan David', 'Alfonso'],
      ['Roger', 'Triana Cardenas'],
      ['Sergio Andres', 'Mendez Sánchez'],
      ['Jhon Nicolas', 'González Vallejo'],
      ['David Ricardo', 'Rodríguez Torres'],
      ['Julián Felipe', 'Angarita Cárdenas'],
      ['Samuel Nicolás', 'Rubiano Joya'],
    ],
  },
  {
    id: 'bra-masc',
    name: 'Brasil Masculino Mayor',
    roster: [
      ['Gabriel', 'Foganholo'],
      ['Matheus Sampaio', 'Alves'],
      ['Enzo Rosa Chiavarini', 'Altavista'],
      ['André Lucas Gois', 'Soares'],
      ['Diogo', 'Barbosa'],
      ['Gabriel Gomes Garcia', 'Cimini'],
      ['Leonardo', 'Ide'],
      ['Leonardo de Souza Esteves', 'dos Santos'],
      ['Matheus Willian Silva', 'do Carmo'],
      ['Murilo Augusto dos Santos', 'Lima'],
      ['Pedro Zabini', 'de Moraes'],
      ['Tiago Alquimim', 'Gross'],
    ],
  },
  {
    id: 'bra-fem',
    name: 'Brasil Femenino',
    roster: [
      ['Beatriz Bueno', 'Cruz'],
      ['Beatriz Alquimin', 'Gross'],
      ['Clarice Bohland', 'Figueiredo'],
      ['Clarissa Natsumi', 'Fuzihara'],
      ['Maria Paula Giustino', 'Jorge'],
      ['Marina Kassner', 'Moura'],
      ['Melissa Iglesias', 'Alonso'],
      ['Olga Midori Goyo', 'Sakaguchi'],
      ['Jakelline Oliveira', 'Silva'],
      ['Rafaela Gomes', 'da Silva'],
      ['Débora Pinheiro', 'Marini'],
      ['Nathália Telles', 'Tavares'],
    ],
  },
  {
    id: 'bra-master-masc',
    name: 'Brasil Master Masculino',
    roster: [
      ['Archimedes', 'de Moura Junior'],
      ['Ricardo Augusto', 'França'],
      ['Kleber Ayala', 'Spinuzze'],
      ['Francisco Roberto', 'Loria Filho'],
      ['Arssuele José', 'Dias'],
      ['Cassio Martim', 'Pereira'],
      ['Marco Antonio', 'de Almeida'],
      ['Ivan Ferreira', 'dos Santos'],
      ['Silas Sinotti', 'de Oliveira'],
      ['Celso Tau', 'Zymberg'],
      ['Paulo Donizeti', 'Ferreira'],
      ['Adilson', 'Pereira'],
    ],
  },
  {
    id: 'bra-fem-master',
    name: 'Brasil Femenino Master',
    roster: [
      ['Salete', 'Momjian'],
      ['Monica Mattos Janeba', 'Pimenta'],
      ['Sylvia Cecilia de Campos', 'Bueno'],
      ['Ana Flavia Almeida', 'Perassoli'],
      ['Neide Akemi Fukushima', 'Ide'],
      ['Marina Ferreira Amaral', 'de Almeida'],
      ['Telma Gomes Santos', 'Hayashibara'],
      ['Cristiane Silva', 'de Sousa'],
      ['Alessandra Cristina de Lima', 'Zymberg'],
      ['Mayara Yumi Oliveira', 'Fukuda'],
      ['Olga Midori Goyo', 'Sakaguchi'],
      ['Clarissa Natsumi', 'Fuzihara'],
    ],
  },
];

function buildScoutingData(defs: ScoutingTeamDef[]): { players: Player[]; teamPools: TeamPool[] } {
  const players: Player[] = [];
  const teamPools: TeamPool[] = [];
  const usedIds = new Set<string>();

  defs.forEach((team) => {
    const playerIds: string[] = [];

    team.roster.forEach(([firstName, lastName], index) => {
      const base = `${team.id}-${slugify(`${firstName} ${lastName}`)}`;
      let id = base;
      let suffix = 2;

      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      players.push({
        id,
        firstName,
        lastName,
        number: index + 1,
        position: 'Wing',
        usualPlayingZone: 'central',
        dominantHand: 'Right',
        caps: 0,
        goals: 0,
        blocks: 0,
      });
      playerIds.push(id);
    });

    teamPools.push({ id: team.id, name: team.name, playerIds });
  });

  return { players, teamPools };
}

const scoutingData = buildScoutingData(scoutingTeamDefs);

export const scoutingPlayers: Player[] = scoutingData.players;

export const scoutingTeamPools: TeamPool[] = scoutingData.teamPools;

export const scoutingTeamPoolIds = scoutingTeamPools.map((pool) => pool.id);
