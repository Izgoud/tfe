$(document).ready(function(){

var Intro = {
	slide : 1,
	animating: false,
	viewing: false,

	init: function(){
		var $this = this;
		if( !$this.animating ){
			$this.animating = true;
			$this.viewing = true;
			$('#intro_prev').addClass('disabled');
			$('#intro').velocity({
				opacity: 1
			},{
				display: 'block',
				duration: 750,
				begin: function(){
					$this.slide = 1;
				},
				complete:function(){
					$('#intro_slide_01').velocity({
						opacity: 1
					},{
						display: 'block',
						duration: 750,
						complete:function(){
							$this.animating = false;
						}
					})
				}
			});
		}
	},

	prev: function(){
		var $this = this;
		if( $this.slide > 1 && !$this.animating ){
			$this.animating = true;
			$('#intro_slide_0'+$this.slide).velocity({
				opacity: 0
			},{
				display: 'none',
				duration: 750,
				begin:function(){
					if( $this.slide == 2 )
						$('#intro_prev').addClass('disabled');
				},
				complete:function(){
					$this.slide --;
					$('#intro_slide_0'+$this.slide).velocity({
						opacity: 1
					},{
						display: 'block',
						duration: 750,
						complete:function(){
							$this.animating = false;
						}
					})
				}
			})
		}
	},

	next: function(){
		var $this = this;
		if( $this.slide < 3 && !$this.animating ){
			$this.animating = true;
			$('#intro_slide_0'+$this.slide).velocity({
				opacity: 0
			},{
				display: 'none',
				duration: 750,
				complete:function(){
					$this.slide ++;
					$('#intro_slide_0'+$this.slide).velocity({
						opacity: 1
					},{
						display: 'block',
						duration: 750,
						complete:function(){
							$this.animating = false;
							if( $this.slide > 1 )
								$('#intro_prev').removeClass('disabled');
						}
					})
				}
			})
		} else if( this.slide == 3 )
			$this.skip();
	},

	skip: function(){
		var $this = this;

		if( $this.slide == 4 ) return;
		$('#intro').velocity({
			opacity: 0
		},{
			display: 'none',
			duration: 750,
			begin: function(){
				$this.viewing = false;
			},
			complete: function(){
				$('.intro_slide').css('opacity', 0).hide();
			}
		});
	}
}
var intro = Object.create(Intro);
if( !sessionStorage['watched_intro'] ) {
	sessionStorage['watched_intro'] = true;
	intro.init();
}

$('#intro_next').click(function(){
	intro.next();
});

$('#intro_prev').click(function(){
	intro.prev();
});

$('.intro_skip').click(function(e){
	intro.skip();
	e.preventDefault();
});

$('#toIntro').click(function(){
	intro.init();
});

var Map = {
	tiles: [],
	grid : [],

	import : function( map ){
		var $this = this;
		$.ajax({
			url: "maps/"+map+".json",
			dataType: "json",
			success: function(data) {
				$this.tiles = data.tiles;
				$this.build( this.tiles );

			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log('ERROR', textStatus, errorThrown);
			}
		});
	},

	tileWidth : 64,
	tileHeight : 46,
	ZCenter : 3,
	tileDelay: 0,
	build : function( tiles ){
		$('#terrain').text('');
		game.state = 'play';
		ENTITIES = [];
		this.grid = [];
		this.oldLight = {};
		this.tileDelay = 0;
		this.mapMaxZ = -999;
		this.mapMaxY = -999;
		this.mapMaxX = -999;
		this.mapMinZ = 999;
		this.mapMinY = 999;
		this.mapMinX = 999;
		this.getMinsMaxs();
		lastEntityID = 0;

		for( i in this.tiles ) {
			var tile = this.tiles[i];
			this.appendTiles( tile.z, tile.y, tile.x, tile.infos );
		};

		this.updateLight();
		setTimeout(function(){
			game.init();
		}, 1000);
	},

	mapMaxZ : -999,
	mapMaxY : -999,
	mapMaxX : -999,
	mapMinZ : 999,
	mapMinY : 999,
	mapMinX : 999,

	getMinsMaxs : function(){
		for (var i = this.tiles.length - 1; i >= 0; i--) {
			var tile = this.tiles[i];
			this.createGrid( tile );

			if( this.mapMaxX < tile.x+tile.y/2 ) this.mapMaxX = tile.x+tile.y/2;
			if( this.mapMaxY < tile.y ) this.mapMaxY = tile.y;
			if( this.mapMaxZ < tile.z ) this.mapMaxZ =tile.z;

			if( this.mapMinX > tile.x+tile.y/2 ) this.mapMinX = tile.x+tile.y/2;
			if( this.mapMinY > tile.y ) this.mapMinY = tile.y;
			if( this.mapMinZ > tile.z ) this.mapMinZ =tile.z;

			if( this.mapMaxZ*this.mapMinZ > 0 )
				var mapCountZ = Math.abs(Math.abs(this.mapMaxZ) - Math.abs(this.mapMinZ));
			else
				var mapCountZ = Math.abs(this.mapMaxZ) + Math.abs(this.mapMinZ);

			if( this.mapMaxY*this.mapMinY > 0 )
				var mapCountY = Math.abs(Math.abs(this.mapMaxY) - Math.abs(this.mapMinY));
			else
				var mapCountY = Math.abs(this.mapMaxY) + Math.abs(this.mapMinY);

			if( this.mapMaxX*this.mapMinX > 0 )
				var mapCountX = Math.abs(Math.abs(this.mapMaxX) - Math.abs(this.mapMinX));
			else
				var mapCountX = Math.abs(this.mapMaxX) + Math.abs(this.mapMinX);
		};

		this.setMapSize( mapCountZ, mapCountY, mapCountX );
	},

	createGrid: function( tile ){
		if( !this.grid[tile.z] )
			this.grid[tile.z] = {};

		if( !this.grid[tile.z][tile.y] )
			this.grid[tile.z][tile.y] = {};

		this.grid[tile.z][tile.y][tile.x] = { "infos" : tile.infos };
	},

	terrainPadding: 64,
	setMapSize : function( mapCountZ, mapCountY, mapCountX ){
		var mapWidth = ( mapCountX+1 )*this.tileWidth+this.terrainPadding*2;
		var	mapHeight = ( mapCountY+1 )*this.tileHeight+this.tileWidth-this.tileHeight+(this.tileWidth/2.7)+this.terrainPadding*2;

		$('#terrain').css({
			'width': Math.round(mapWidth),
			'height': Math.round(mapHeight),
			'margin-left': Math.round(-mapWidth/2),
			'margin-top': Math.round(-mapHeight/2),
		});

		$('#scrollHack').css({
			'width': Math.round(mapWidth),
			'height': Math.round(mapHeight)
		});
	},

	waterfall : function( z, y, x ){
		var $this = this;
		var waterfall = [];
		var height = 0;
		var tileBelow = 'swagg';

		while( z-height != 0 ){
			try {
				tileBelow = $this.grid[z-height-1][y][x].infos;
			} catch(err){
				tileBelow = null;
			}

			if( tileBelow != null ) break;

			var tile = { "x":x, "y":y, "z": z-height-1, "infos" : { "hitbox":"obstacle", "mat":"water" }};

			$this.createGrid( tile );
			waterfall.push(z-height-1);
			height ++;
		}

		for( i in waterfall ) {
			var coords = $this.applyCoords( waterfall[i], y ,x );
			var water = '<div id="tile_'+waterfall[i]+'_'+y+'_'+x+'" class="obstacle fog water_full" ';
			water += 'style="left: '+coords.left+'px; top: '+coords.top+'px; z-index: '+coords.zIndex+'; ';
			if( tileBelow == null )
				water += 'opacity : '+(waterfall[i]+1)/(waterfall.length+1)+';';
			water += '"><div class="visual"></div>';
			water += '</div>';

			$('#terrain').append(water);
		};
	},

	appendTiles : function( z, y, x, infos ){
		var $this = this;
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);
		var coords = $this.applyCoords(z, y, x);
		var tile = '<div id="tile_'+z+'_'+y+'_'+x+'" class="fog '+( infos.ramp!=null?'ramp ':'' )+infos.hitbox+' '+infos.mat+'" data-z="'+z+'" data-y="'+y+'" data-x="'+x+'"';
		tile += ' style="left: '+coords.left+'px; top: '+coords.top+'px; z-index: '+coords.zIndex+';">';
		
		if( infos.hitbox != 'obstacle' )
			tile += '<div class="physical"></div>';

		tile += '<div class="visual">';

		if( infos.mat == 'water' ){
			try {
				var tileBelow =  $this.grid[z-1][y][x].infos;
			} catch(err){
				$this.waterfall( z, y, x );
			}
		}

		if( infos.deco )
			tile += '<div class="deco '+infos.deco+'"></div>';
		if( infos.hitbox != 'obstacle' )
			tile += '<div class="indicator"></div>';

		tile += '</div></div>';
		if( infos.prop )
			tile += '<div id="obstacle_'+z+'_'+y+'_'+x+'" class="prop '+infos.prop+'" style="left: '+coords.left+'px; top: '+coords.top+'px; z-index: '+(coords.zIndex+9998)+';"></div>';
			
		if( infos.building ){
			var building = infos.building;
			tile += '<div id="building_'+z+'_'+y+'_'+x+'" class="building stage'+building.stage+' '+building.color+' '+building.type+' '+building.roof+'" ';
			tile += 'data-z="'+z+'" data-y="'+y+'" data-x="'+x+'" data-color="'+building.color+'"';
			tile += 'style="left: '+coords.left+'px; top: '+(coords.top-26)+'px; z-index: '+(coords.zIndex+10002)+';">';
			tile += 	'<div class="base view0'+(building.direction+1)+'"></div>';
			if( building.stage >= 2 )
				tile += '<div class="firstfloor"></div>';
			if( building.stage >= 3 )
				tile += '<div class="secondfloor '+building.windows+'"></div>';
			tile += 	'<div class="roof"></div>';
			if( building.type == 'objective' )
				tile += '<div class="flag"></div>';
			tile += '</div><div class="selection" style="left: '+coords.left+'px; top: '+(coords.top-26)+'px; z-index: '+(coords.zIndex+10001)+';"></div>';

			if( building.type == 'objective' )
				Objective.spawn( z, y, x, building.color, building.direction );
			else
				Building.spawn( z, y, x, building.color, building.direction );
		}

		$('#terrain').append( tile );
	},

	applyCoords : function( z, y, x ){
		var $this = this;
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);
		var posY = (y-$this.mapMinY)*$this.tileHeight - (z-$this.ZCenter)*26 + $this.terrainPadding+(map.grid[z][y][x].infos.ramp!=null?13:0);
		var posX = (x-$this.mapMinX)*$this.tileWidth + y*$this.tileWidth/2 + $this.terrainPadding;
		var zIndex = z*100 + y*10000 + x;
		var unitZIndex = z*100 + (y+1)*10000 + x;

		return {"top":posY, "left":posX, "zIndex":zIndex, "unitZIndex" : unitZIndex };
	},

	oldLight : {},
	newLight : {},
	updateLight : function(){
		var $this = this;
		var tilesToDarken = [];

		// CREATE THE NEW LIGHTING ARRAY
		$this.newLight = {};
		for( unit in ENTITIES ){
			if( ENTITIES[unit].color != game.playerOrder[game.playerPlaying] ) continue;
			var unit = ENTITIES[unit];
			for( tile in unit.seeTiles ){
				var tile = unit.seeTiles[tile];
				var key = tile[0]+'_'+tile[1]+'_'+tile[2];
				$this.newLight[key] = true;
			}
		}

		//LIGHT UP THE TILES IN NEW ARRAY
		for( tile in $this.newLight ){
			$('#tile_'+tile).removeClass('fog');
		}

		//SWITCH OFF THE TILES IN OLD ARRAY, WHICH ARE NOT IN THE NEW ONE.
		for( oldTile in $this.oldLight ){
			var inNewArray = false;

			for( newTile in $this.newLight ){
				if( oldTile == newTile ){
					inNewArray = true;
				}
			}

			if( !inNewArray ){
				$('#tile_'+oldTile).addClass('fog');
			}
		}

		for( unit in ENTITIES ){
			if( ENTITIES[unit].color != game.playerOrder[game.playerPlaying] ){
				var coords = ENTITIES[unit].z+'_'+ENTITIES[unit].y+'_'+ENTITIES[unit].x;
				var inNewArray = false;
				for( newTile in $this.newLight ){
					if( coords == newTile ){
						inNewArray = true;
					}
				}

				if( !ENTITIES[unit].maskWithFog ) continue;
				if( inNewArray )
					ENTITIES[unit].setVisible();
				else
					ENTITIES[unit].setInvisible();
			}
		}

		$this.oldLight = $this.newLight;
		$this.newLight = {};
	},

	getTilesInRange : function( z, y, x, radius ){
		var results = []
		for (var i = 0; i < (radius*2+1); i++) {
			for (var j = 0; j < (radius*2+1); j++) {
				if( Math.abs(radius-j + radius-i) > radius) continue;

				results.push( [z, y+radius-j, x+radius-i] );
			}
		};

		for( i in results ){
			var z = results[i][0];
			var y = results[i][1];
			var x = results[i][2];

			try {
				var tileAbove = map.grid[z+1][y][x];
				if( tileAbove.infos.ramp!=null )
					results.push( [z+1, y, x] );
			} catch(err){}

			var j = 1;
			while( j != 0 ){
				try {
					if( map.grid[z-j][y][x] ){
						var tile = [z-j, y, x];
						results.push(tile);
					}
					j ++;
				} catch(err){
					j = 0;
				}
			}
		}

		return results;
	},

	getNeighbours : function( z, y, x, start, ennemies ){
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);
		var index = 0;
		if( start ) index = start;
		var neighbours = [
			[ y,	 x+1 ], 	// VUE01
			[ y-1, x+1 ],	// VUE02
			[ y-1, x ],		// VUE03
			[ y,	 x-1 ],	// VUE04
			[ y+1, x-1 ],	// VUE05
			[ y+1, x ]		// VUE06
		];

		var goodNeighbours = [];
		var thisTile = map.grid[z][y][x];
		if( thisTile.infos.ramp!=null ){
			for (var i = 0; i < neighbours.length; i++) {
				var tileAbove = map.grid[z][neighbours[index][0]][neighbours[index][1]];
				var tileBelow = map.grid[z-1][neighbours[index][0]][neighbours[index][1]];

				if( thisTile.infos.ramp == index && ((!tileAbove.infos.unit) || (!ennemies && tileAbove.infos.unit && ENTITIES[tileAbove.infos.unit].color != ENTITIES[SELECTED.classe+SELECTED.id].color)) ){
					var tile = {};
					tile.y = neighbours[index][0];
					tile.x = neighbours[index][1];
					tile.z = z;
					tile.view = index;
					goodNeighbours.push(tile);
				} else if( thisTile.infos.ramp == index-3 && ((!tileBelow.infos.unit) || (!ennemies && tileBelow.infos.unit && ENTITIES[tileBelow.infos.unit].color != ENTITIES[SELECTED.classe+SELECTED.id].color)) ){
					var tile = {};
					tile.y = neighbours[index][0];
					tile.x = neighbours[index][1];
					tile.z = z-1;
					tile.view = index;
					goodNeighbours.push(tile);
				}

				index ++;
				if(index > 5) index = 0;
			}

			return goodNeighbours;
		}

		for (var i = 0; i < neighbours.length; i++) {
			try {
				var neighbourAbove = map.grid[z+1][neighbours[index][0]][neighbours[index][1]];
				if( neighbourAbove && neighbourAbove.infos.ramp == index && ((!neighbourAbove.infos.unit) || (!ennemies && neighbourAbove.infos.unit && ENTITIES[neighbourAbove.infos.unit].color != ENTITIES[SELECTED.classe+SELECTED.id].color)) ){
					var tile = {};
					tile.y = neighbours[index][0];
					tile.x = neighbours[index][1];
					tile.z = z+1;
					tile.view = index;
					goodNeighbours.push(tile);
				}
			} catch(err){
				var neighbourAbove = null;
			}

			try {
				var neighbour = map.grid[z][neighbours[index][0]][neighbours[index][1]];
				if( !neighbourAbove && neighbour.infos.hitbox != 'obstacle' && ((!neighbour.infos.unit) || (!ennemies && neighbour.infos.unit && ENTITIES[neighbour.infos.unit].color != ENTITIES[SELECTED.classe+SELECTED.id].color)) ){
					if( (neighbour.infos.ramp!=null && neighbour.infos.ramp == index-3) || neighbour.infos.ramp==null ){
						var tile = {};
						tile.y = neighbours[index][0];
						tile.x = neighbours[index][1];
						tile.z = z;
						tile.view = index;
						goodNeighbours.push(tile);
					}
				}
			} catch(err){}

			index ++;
			if(index > 5) index = 0;
		}

		return goodNeighbours;
	}
}
var map = Object.create(Map);

var Building = {
	color: '',
	z : 0,
	y : 0,
	x : 0,
	id : 0,
	selected : false,
	viewDistance : 3,
	maskWithFog : false,
	seeTiles : [],
	direction : 0,
	classe : 'spawn',
	type : 'building',

	spawn : function( z, y, x, color, direction ){
		var $this = this;
		var thisName = $this.classe+lastEntityID;
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);
		if( $this.classe == 'objective' ){
			ENTITIES[thisName] = Object.create(Objective);
			ENTITIES[thisName].unitsAround = { 'red':0, 'blue':0 };
			ENTITIES[thisName].owner = '';
			var neighbours = map.getNeighbours( z, y, x );
			for (var i = neighbours.length - 1; i >= 0; i--) {
				var tile = neighbours[i];
				map.grid[tile.z][tile.y][tile.x].infos['obj'] = thisName;
			};
		} else {
			ENTITIES[thisName] = Object.create(Building);
		}

		ENTITIES[thisName].z = z;
		ENTITIES[thisName].y = y;
		ENTITIES[thisName].x = x;

		if( color ) ENTITIES[thisName].color = color;
		if( direction ) ENTITIES[thisName].direction = direction;
		ENTITIES[thisName].seeTiles = map.getTilesInRange( z, y, x, this.viewDistance );
		ENTITIES[thisName].id = lastEntityID;
		lastEntityID ++;


		var bati = ENTITIES[thisName];
		map.grid[bati.z][bati.y][bati.x].infos.building = thisName;
	},

	select : function(){
		var $this = this;
		if( $this.color != game.playerOrder[game.playerPlaying] ) return;

		if( $this.selected == true ){
			$this.deselect();
		} else {
			// Deselect other entities
			if( SELECTED ) {
				ENTITIES[SELECTED.classe+SELECTED.id].deselect();
			}

			$this.selected = true;
			// console.log( $this.classe+$this.id );
			SELECTED = ENTITIES[$this.classe+$this.id];
			$('#building_'+$this.z+'_'+$this.y+'_'+$this.x).addClass('selected');
			sidebar.change('barrack');
		}
	},

	deselect : function(){
		var $this = this;
		$this.selected = false;
		SELECTED = null;
		$('#building_'+$this.z+'_'+$this.y+'_'+$this.x).removeClass('selected');
		sidebar.change('default');
	},

	createUnit : function( classe, color ){
		var coords = map.getNeighbours( this.z, this.y, this.x, this.direction, true );
		for(i in coords ){
			var unit = Knight.spawn( this.z, this.y, this.x, color, this.direction);
			if( unit ) ENTITIES[unit].goTo( this.z, coords[i].y, coords[i].x );
			break;
		}
	}
}
var Objective = Object.create(Building)
Objective.classe = 'objective';
Objective.viewDistance = 2;
Objective.addUnitAround = function( unit ){
	var $this = this;
	var thisName = $this.classe+$this.id;

	ENTITIES[thisName].unitsAround[ENTITIES[unit].color] += 1;
}
Objective.removeUnitAround = function( unit ){
	var $this = this;
	var thisName = $this.classe+$this.id;

	ENTITIES[thisName].unitsAround[ENTITIES[unit].color] -= 1;
}
Objective.updateOwner = function(){
	var $this = this;
	var thisName = $this.classe+$this.id;
	var thisBuilding = ENTITIES[thisName];
	var owner = '';
	for( team in thisBuilding.unitsAround ){
		if( owner!='' && thisBuilding.unitsAround[team] > thisBuilding.unitsAround[owner] ){
			owner = team;
		} else if( owner!='' && thisBuilding.unitsAround[team] == thisBuilding.unitsAround[owner] ){
			owner = '';
		} else if( owner=='' && thisBuilding.unitsAround[team] != 0 ) {
			owner = team;
		}
	}
	thisBuilding.color = owner;
	$('#building_'+thisBuilding.z+'_'+thisBuilding.y+'_'+thisBuilding.x).removeClass('red blue').addClass(owner);
}

var ENTITIES = [];
var lastEntityID = 0;
var SELECTED = null;
var Unit = {
	z : 5,
	y : 5,
	x : 5,
	color : 'red',
	anim : 'idle',
	direction : 5,
	viewDistance : 2,
	cost : 5,
	movesPerRound : 2,
	pop : 1,

	hp : 40,
	damage : 20,
	movesLeft : 2,

	id : 0,
	type : 'unit',
	selected : false,
	maskWithFog : true,
	seeTiles : [],

	spawn : function( z, y, x, color, direction ){
		var $this = this;
		if( PLAYERS[game.playerOrder[game.playerPlaying]].po < $this.cost || PLAYERS[game.playerOrder[game.playerPlaying]].pop >= game.popLimit ) return false;
		PLAYERS[game.playerOrder[game.playerPlaying]].po -= $this.cost;
		PLAYERS[game.playerOrder[game.playerPlaying]].pop += $this.pop;
		sidebar.updateUnitState();
		sidebar.updatePO( '-'+$this.cost, true );
		sidebar.updatePOP();

		var thisName = $this.classe+lastEntityID;
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);

		ENTITIES[thisName] = Object.create(Knight);
		var unit = ENTITIES[thisName];
		if( y != null && x != null && z != null ) {
			unit.z = z;
			unit.y = y;
			unit.x = x;
		}
		if( color ) unit.color = color;
		if( direction !== '' ) unit.direction = direction;
		if( game.round == 0 ){ unit.movesLeft = unit.movesPerRound+game.playerPlaying }

		unit.id = lastEntityID;
		lastEntityID ++;

		// Add the unit to the map.grid
		map.grid[unit.z][unit.y][unit.x].infos.unit = thisName;

		var coords = map.applyCoords( unit.z, unit.y, unit.x )
		var template = '<div id="'+thisName+'" class="unit '+unit.classe;
		template += ' '+unit.color+'" data-anim="'+unit.anim+'" data-view="'+unit.direction+'" ';
		template += 'style="display: none; left: '+coords.left+'px; top: '+coords.top+'px; z-index: '+coords.unitZIndex+';"';
		template += '><div class="noMovesLeft"></div></div>';
		$('#terrain').append(template);

		if( unit.color != game.playerOrder[game.playerPlaying] ) {
			var key = unit.z+'_'+unit.y+'_'+unit.x;
			for( i in map.oldLight ){
				if( key == i ){
					unit.setVisible();
					break;
				}
			}
		} else {
			unit.setVisible();
		}

		return thisName;
	},

	select: function(){
		var $this = this;

		if( $this.color != game.playerOrder[game.playerPlaying] ) return;
		// if( this.color != game.playerOrder[game.playerPlaying] ) return;

		// Deselect if unit is selected.
		if( $this.selected == true ){
			$this.deselect();
		} else {
			// Deselect other units
			if( SELECTED ) {
				ENTITIES[SELECTED.classe+SELECTED.id].deselect();
			}

			$this.selected = true;
			SELECTED = ENTITIES[$this.classe+$this.id];
			$('#tile_'+$this.z+'_'+$this.y+'_'+$this.x).addClass('selected');

			var neighbours = map.getNeighbours( $this.z, $this.y, $this.x );
			for( i in neighbours){
				var tile = map.grid[neighbours[i].z][neighbours[i].y][neighbours[i].x];
				if( !tile.infos.unit && $this.movesLeft != 0 )
					$('#tile_'+neighbours[i].z+'_'+neighbours[i].y+'_'+neighbours[i].x).addClass('dest');
				if( tile.infos.unit && $this.movesLeft != 0 )
					$('#tile_'+neighbours[i].z+'_'+neighbours[i].y+'_'+neighbours[i].x).addClass('target');
			}

			sidebar.change('unit');
			$('#hp').text($this.hp);
			$('#damage').text($this.damage);
			$('#movesLeft').text($this.movesLeft);
		}

	},

	deselect: function(){
		var $this = this;
		if( $this.selected ){
			SELECTED = null;
			$this.selected = false;
			$('#tile_'+$this.z+'_'+$this.y+'_'+$this.x).removeClass('selected');
			
			$('.dest').removeClass('dest');
			$('.target').removeClass('target');
			
			sidebar.change('default');
		}
	},

	setVisible : function(){
		var thisName = this.classe+this.id;
		$('#'+thisName).show();

		$('#tile_'+this.z+'_'+this.y+'_'+this.x).addClass('busy');
	},

	setInvisible : function(){
		var thisName = this.classe+this.id;
		$('#'+thisName).hide();

		$('#tile_'+this.z+'_'+this.y+'_'+this.x).removeClass('busy');
	},

	setAnim : function( anim ){
		var unit = this.classe+this.id;
		$('#'+unit).attr('data-anim', anim);
	},

	attack : function( z, y, x ){
		var $this = this;
		if( this.movesLeft == 0 ) return;
		this.movesLeft --;

		var	thisName = $this.classe+$this.id;
		var unit = ENTITIES[$this];

		if( $this.movesLeft == 0 )
			$('#'+thisName).addClass('inactive');
		$this.changeDir( z, y, x );
		$this.deselect();
		$this.setAnim( 'attack' );
		ENTITIES[map.grid[z][y][x].infos.unit].kill();

		setTimeout(function(){
			$this.setAnim( 'idle' );
		}, 1000);
	},

	kill : function(){
		var $this = this;
		var thisName = $this.classe+$this.id;
		var unit = ENTITIES[thisName];

		if( map.grid[unit.z][unit.y][unit.x].infos.obj!=null ){
			ENTITIES[map.grid[unit.z][unit.y][unit.x].infos.obj].removeUnitAround( thisName );
			ENTITIES[map.grid[unit.z][unit.y][unit.x].infos.obj].updateOwner();
			map.updateLight();
		}

		$('#tile_'+unit.z+'_'+unit.y+'_'+unit.x).removeClass('busy');
		delete map.grid[unit.z][unit.y][unit.x].infos.unit;
		setTimeout(function(){
			ENTITIES[thisName].setAnim( "death" );
			PLAYERS[ ENTITIES[thisName].color ].pop -= ENTITIES[thisName].pop;
			delete ENTITIES[thisName];
		}, 500);
		setTimeout(function(){
			$('#'+thisName).fadeOut(1000, function(){
				$('#'+thisName).remove();
			});
		}, 2000);
	},

	changeDir : function( z, y, x ){
		var $this = this;
		var newDir = 0;
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);
		var neighbours = [
			[ $this.y,		$this.x+1 ], 	// VUE01
			[ $this.y-1,	$this.x+1 ],	// VUE02
			[ $this.y-1,	$this.x ],		// VUE03
			[ $this.y,		$this.x-1 ],	// VUE04
			[ $this.y+1,	$this.x-1 ],	// VUE05
			[ $this.y+1,	$this.x ]		// VUE06
		];

		for( i in neighbours ){
			if( neighbours[i][0] == y && neighbours[i][1] == x )
				newDir = i;
		}

		$this.direction = newDir;
		$('#'+$this.classe+$this.id).attr('data-view', newDir);
	},

	goTo : function( z, y, x ){
		var $this = this;
		if( $this.movesLeft == 0 ) return;
		var newCoords = map.applyCoords( z, y, x );
		var thisName = $this.classe+$this.id;
		var unit = ENTITIES[thisName];
		z = parseInt(z);
		y = parseInt(y);
		x = parseInt(x);

		$this.changeDir( z, y, x );
		if( y != null && x != null && z != null ) {
			$this.movesLeft --;
			unit.deselect();
			unit.setAnim( 'run' );
			delete map.grid[unit.z][unit.y][unit.x].infos.unit;


			if( map.grid[z][y][x].infos.obj!=null && map.grid[$this.z][$this.y][$this.x].infos.obj!=null ){
			} else if( map.grid[z][y][x].infos.obj!=null ){
				ENTITIES[map.grid[z][y][x].infos.obj].addUnitAround( thisName );
				ENTITIES[map.grid[z][y][x].infos.obj].updateOwner();
			} else if( map.grid[$this.z][$this.y][$this.x].infos.obj!=null ){
				ENTITIES[map.grid[$this.z][$this.y][$this.x].infos.obj].removeUnitAround( thisName );
				ENTITIES[map.grid[$this.z][$this.y][$this.x].infos.obj].updateOwner();
			}

			// Remove the busy state to the old tile.
			$('#tile_'+unit.z+'_'+unit.y+'_'+unit.x).removeClass('busy');
			// Update coordinates.
			ENTITIES[thisName].z = parseInt(z);
			ENTITIES[thisName].y = parseInt(y);
			ENTITIES[thisName].x = parseInt(x);
			ENTITIES[thisName].seeTiles = map.getTilesInRange( z, y, x, $this.viewDistance );
			map.grid[z][y][x].infos.unit = thisName;


			setTimeout(function(){
				$('#'+thisName).css('z-index', newCoords.unitZIndex);
			}, 500);

			if( $this.movesLeft == 0 )
				$('#'+thisName).addClass('inactive');
			$('#'+thisName).velocity({
				left: newCoords.left,
				top: newCoords.top
			}, {
				duration: 1000,
				easing: 'linear',
				complete: function(){
					unit.setAnim( 'idle' );
					// Add the busy state to the new tile.
					if( unit.color == game.playerOrder[game.playerPlaying] )
						$('#tile_'+unit.z+'_'+unit.y+'_'+unit.x).addClass('busy');
				}
			});

			map.updateLight();
		} else {
			console.log( "goTo : Wrong coords Given" );
		}
	},

	capture : function( objective ){
		var $this = this;
		if( $this.movesLeft == 0 ) return;

		if( objective.classe == 'spawn' ){
			$this.goTo( objective.z, objective.y, objective.x );
			$this.deselect();
			setTimeout(function(){
				game.end( $this.color );
			}, 1500);
		}
	}
}
var Knight = Object.create(Unit);
Knight.classe = 'knight';

var Sidebar = {
	change : function( state ){
		$('.sidebarDiv').removeClass('show');
		$('#sidebar_'+state).addClass('show');
	},

	updatePO : function( value, anim ){
		if( anim ){
			var po = '<div class="po'+( parseInt(value)<0?' cost':'' )+'">'+value+'</div>';
			$(po).prependTo($('#poFeed')).delay(1000).slideUp(500);
			var color = game.playerOrder[game.playerPlaying];

			setTimeout(function(){
				if( color == game.playerOrder[game.playerPlaying] )
					$('#po').text( parseInt($('#po').text())+parseInt(value) );
			}, 1100);
		} else {
			$('#po').text(value);
		}
	},

	updateUnitState : function(){
		$('.barrack_unit').each(function(){
			var cost = parseInt($(this).find('.po').text());
			if( PLAYERS[game.playerOrder[game.playerPlaying]].po < cost || PLAYERS[game.playerOrder[game.playerPlaying]].pop >= game.popLimit ){
				$(this).addClass('disabled');
			} else {
				$(this).removeClass('disabled');
			}
		});
	},

	updatePOP : function(){
		$('#pop_current').text( PLAYERS[game.playerOrder[game.playerPlaying]].pop );
	}
};
var sidebar = Object.create(Sidebar);
sidebar.change('default');
	
var PLAYERS = {
	'red': { 'po':0, 'pop':0 },
	'blue':{ 'po':0, 'pop':0 }
};

var Game = {
	playerOrder : ['red', 'blue'],
	playerPlaying : 0,
	playersCount : 2,
	startMoney : 13,
	// startMoneyDifference : 1,
	round : 0,
	roundTime : 30,
	currentTime : 30,
	state : 'finished',
	popLimit : 5,

	init : function(){
		var $this = this;
		$this.playerPlaying = 0;
		$this.resetPlayers();
		$('pop_max').text( $this.popLimit );

		var i = 0;
		for(player in PLAYERS){
			// PLAYERS[player].po = $this.startMoney+(i*$this.startMoneyDifference);
			PLAYERS[player].po = $this.startMoney;
			PLAYERS[player].pop = 0;
			i++;
		}

		sidebar.updatePO( PLAYERS[$this.playerOrder[$this.playerPlaying]].po );
		sidebar.updatePOP( PLAYERS[$this.playerOrder[$this.playerPlaying]].pop );
		sidebar.updateUnitState();
		sidebar.change('default');

		$('#body').removeClass('finished').addClass('play');
		$this.round = 0;
		$this.state = 'play';
		$this.timer();
	},

	resetPlayers : function(){
		var $this = this;
		$('#body').removeClass( 'red blue' ).addClass( $this.playerOrder[$this.playerPlaying] );
		map.updateLight();
	},

	timeInterval : null,
	timer : function(){
		$this = this;
		$('#timerText').find('span').text( $this.currentTime );

		if( $this.currentTime == 0 ) return;
		$this.timeInterval = setInterval(function(){
			$this.currentTime --;
			var timerWidth = $this.currentTime/$this.roundTime*100;
			$('#timerBar').css('width', timerWidth+'%');
			$('#timerText').find('span').text( $this.currentTime );
			if( $this.currentTime == 0 ) {
				$this.finishRound();
			}
		}, 1000);
	},

	finishRound : function(){
		var $this = this;
		if( $this.currentTime > $this.roundTime-1 || $this.state != 'play' ) return;
		clearInterval( $this.timeInterval );
		$this.currentTime = $this.roundTime;

		if( $this.playerPlaying != $this.playersCount-1 )
			$this.playerPlaying ++;
		else {
			$this.playerPlaying = 0;
			$this.round += 1;
		}

		$('#timerBar').css('width', 0);
		$('#timerBar').velocity({
			left: [0, '100%']
		},{
			duration: 500,
			delay: 500,
			easing: 'ease-out',
			queue: false,
			begin : function(){
				$('#timerBar').css('width', '100%');
				$this.timer();
			}
		});

		$this.resetPlayers();
		sidebar.updatePO( PLAYERS[$this.playerOrder[$this.playerPlaying]].po );
		sidebar.updatePOP();
		if( $this.round != 0 ){
			PLAYERS[$this.playerOrder[$this.playerPlaying]].po += 2;
			sidebar.updatePO( '+2', true );
		}

		// Reset
		for( entity in ENTITIES ) {
			var ent = ENTITIES[entity];
			ent.deselect();
			$('#'+entity).removeClass('inactive');
			if( ent.color == $this.playerOrder[$this.playerPlaying] && ent.maskWithFog ){
				ent.setVisible();
				ent.movesLeft = ent.movesPerRound;
			}

			if( ent.classe == 'objective' && ent.color == $this.playerOrder[$this.playerPlaying] ){
				PLAYERS[$this.playerOrder[$this.playerPlaying]].po += 1;
				var span = '<span class="obj_po">+1</span>';
				$(span)
					.appendTo('#building_'+ent.z+'_'+ent.y+'_'+ent.x)
					.velocity({
						translateY : -36
					},{
						duration : 1400,
						easing 	: 'ease-out',
						complete : function(){
							$('.obj_po').remove();
						}
					});
				sidebar.updatePO( '+1', true );
			}
		}
		sidebar.updateUnitState();
	},

	overlay: function( lightbox ){
		$('#overlay').addClass('active');
		$('#overlay>div').removeClass('active');
		$('#'+lightbox).addClass('active');
	},

	end : function( winner ){
		var $this = this;
		clearInterval( $this.timeInterval );
		$this.overlay( 'won' );
		$('#endTurn').addClass('disabled');
		$('#won .playerColor').text($this.playerOrder[$this.playerPlaying]);
		$this.state = 'finished';
		$('#body').removeClass('play paused').addClass('finished');
	},

	replay: function(){
		var $this = this;
		$this.reset();

		setTimeout(function(){
			$this.init();
		}, 1500);
	},

	reset : function(){
		var $this = this;
		$('#overlay').removeClass('active');
		$('#overlay > div').removeClass('active');
		$('#endTurn').removeClass('disabled');
		$('#body').removeClass('paused play');

		$this.currentTime = $this.roundTime;

		$('#timerText').find('span').text( $this.currentTime );
		$('#timerBar').css('width', 100+'%');

		for( entity in ENTITIES ) {
			var entity = ENTITIES[entity];
			if( entity.type == 'unit' ) entity.kill();
		}
	},

	pause: function(){
		var $this = this;
		clearInterval( $this.timeInterval );
		game.overlay( 'game_menu' );
		$this.state = 'paused';
		// $('#endTurn').addClass('disabled');
		$('#body').removeClass('play').addClass('paused');
	},

	release: function(){
		var $this = this;
		$this.timer();
		$('#overlay').removeClass('active');
		$this.state = 'play';
		// $('#endTurn').removeClass('disabled');
		$('#body').removeClass('paused').addClass('play');
	}
}

var game = Object.create(Game);


/************************\
**        EVENTS			**
\************************/

$('#endTurn:not(.disabled)').click(function(e){
	game.finishRound();

	e.preventDefault();
});

$('#createKnight').click(function(e){
	ENTITIES[SELECTED.classe+SELECTED.id].createUnit( 'knight', game.playerOrder[game.playerPlaying] );

	e.preventDefault();
});

$('.building').live('click', function(e){
	var z = $(this).attr("data-z");
	var y = $(this).attr("data-y");
	var x = $(this).attr("data-x");
	var building = ENTITIES[map.grid[z][y][x].infos.building];

	if( $(this).attr('data-color') != game.playerOrder[game.playerPlaying] ){
		if( SELECTED && SELECTED.type == 'unit' ){
			SELECTED.capture( building );
		}
	} else
		building.select();

	e.preventDefault();
});

$('.busy:not(.target)').live("click", function(e){
	var z = $(this).attr("data-z");
	var y = $(this).attr("data-y");
	var x = $(this).attr("data-x");
	ENTITIES[map.grid[z][y][x].infos.unit].select();

	e.preventDefault();
});

$('.tile.dest').live('click', function(e){
	var parentCoords = $(this).attr("id").split('_');
	var coords = $('.selected').attr("id").split('_');

	var unit = map.grid[coords[1]][coords[2]][coords[3]].infos.unit;
	unit = ENTITIES[unit];
	unit.goTo( parentCoords[1], parentCoords[2], parentCoords[3] );

	e.preventDefault();
});

$('.tile.target').live('click', function(e){
	var parentCoords = $(this).attr("id").split('_');
	var coords = $('.selected').attr("id").split('_');

	var unit = map.grid[coords[1]][coords[2]][coords[3]].infos.unit;
	unit = ENTITIES[unit];
	unit.attack( parentCoords[1], parentCoords[2], parentCoords[3] );

	e.preventDefault();
});

$('#replay').click(function(e){
	game.replay();

	e.preventDefault();
});

$('#pause').click(function(){
	if( game.state == 'play' ){
		game.pause();
	} else if( game.state == 'paused' ){
		game.release();
	}
});

$('#continue').click(function(e){
	game.release();
	e.preventDefault();
});


$('#overlay').click(function(e){
	if( game.state == 'paused' )
		game.release();
});

$('#overlay>div').click(function(e){
	e.stopPropagation();
});

$('.toMenu').click(function(e){
	$('#viewport').velocity({
		translateX: [0, '-100%']
	},{
		display: 'none',
		duration: 1000,
		easing: [0.7,0,0.3,1]
	});

	game.reset();
	e.preventDefault();
});

$('#play').click(function(e){
	if( game.state == 'play' ) return;

	$('#viewport').velocity({
		translateX: ['-100%',0]
	},{
		display: 'block',
		duration: 1000,
		easing: [0.7,0,0.3,1]
	});

	var carte = $('.formMap:checked').val();
	$('#terrain').text('');
	map.import( carte );
	e.preventDefault();
});

$('#mapForm label').click(function(){
	$('#mapIMG').attr('src', 'img/'+$(this).attr('for')+'.jpg');
});

$('#mapForm label').dblclick(function(e){
	$('#viewport').velocity({
		translateX: ['-100%',0]
	},{
		display: 'block',
		duration: 1000,
		easing: [0.7,0,0.3,1]
	});

	var carte = $('.formMap:checked').val();
	$('#terrain').text('');
	map.import( carte );
	e.preventDefault();
});

$(window).keyup(function(e){
	if( intro.viewing == true ){	
		switch(e.keyCode) {
			case 37:
			case 38:
				intro.prev();
				break;
			case 39:
			case 40:
				intro.next();
				break;
			case 27:
				intro.skip();
				break;
		}
	}

	if( game.state == 'play' && e.keyCode == 27 ){
		game.pause();
	} else if( game.state == 'paused' && e.keyCode == 27 ){
		game.release();
	}
});

// Sidebar Scrollbar
$('#game').mCustomScrollbar({
	theme:"minimal-dark",
	scrollInertia: 200,
	axis: "yx",
	scrollbarPosition:"inside"
});

});