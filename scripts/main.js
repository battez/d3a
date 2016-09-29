
/*
	JL Barker 
	1: wrote a D3 program that consumes the feed
	2: draws a map of the UK
	3: Plots the towns form the feed on the map
	4: You can use any details in the feed to enhance the map.

 */
var debugMode = (window.location.hash !== "#debug") ? false : true;

var amount = debugMode ? 20 : document.getElementById('slide').value;

var feedUrl = function (amount) {

	//debug with local script if remote not working:
	//return 'scripts/20.json';
	
	// Feed url:
	//return 'http://ac51041-1.cloudapp.net:8080/Circles/Towns/' + parseInt(amount);
	// alt feed URL:
	return 'http://ac32007.cloudapp.net:8080/Circles/Towns/' + parseInt(amount);
}
var url = feedUrl(amount); 



/*
** Load remote JSON: 
*/ 
// set up a global which will be our dataset:
var dataset; 

// asynchronously load in the JSON from the remote feed:
d3.json(url, function(error, json) {
  
  if (error) return console.warn(error);
  
  // set this JSON data to the global we made earlier:
  dataset = json;
  showD3(); // display our plot now the JSON has had a chance to load:
  //console.log('dataset loaded now, should be plotted.')
  // 
  // unpause the slider again to allow input:
  document.getElementById('slide').disabled = false;
});

// Meanwhile, set up the SVG container for our map, and its projection etc:
var w = 1105;
var h = 1296;
var xOffset = 300;
var yOffset = 250;

// global SVG
var svg = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h);
var currentTowns;
// credit: edited and previewed on mapstarter.com 
var mapFile = 'uk-map-topo-mci.json';
// d3 map projection setup: from 3D to 2D!
var projection = d3.geo.mercator()
    .scale(2250) 
    .center([-5.960072394999926,55.76000251037824]) //projection center
    .translate([w/2 - xOffset, h/2 - yOffset]) //translate to shift the map


// "path" encapsulates the geographic features for us
// then we reference the custom projection from earlier
var path = d3.geo.path().projection(projection);

// group for UK map
var features = svg.append("g")
    .attr("class","features");

// load local copy of UK geodata and display the map 
d3.json(mapFile, function(error,geodata) {
  
  	if (error) return console.log(error); 

  	//Create a separate path for each map feature in our geodata (countries)
	features.selectAll("path")
	    .data(topojson.feature(geodata,geodata.objects.subunits).features) //generate features from TopoJSON
	    .enter()
	    .append("path")
	    .attr("d", path)
	    .attr("title", function (d) {
	    	return d.id;
		})
	    .attr("class", function (d) {
	    	return "subunit " + d.id;
		})
	    features.selectAll(".subunit-label")
        .data(topojson.feature(geodata,geodata.objects.subunits).features)
      	.enter()
      	.append("text")
        .attr("class", function(d) { return "subunit-label " + d.id; })
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", "1em")
        .attr("dx", "0.25em")
        .text(function(d) { return d.properties.name; });
});



/* this is our visualise data wrapper, 
** that gets called once JSON loads from "url" 
**/ 
var showD3 = function(updating) {
	updating = updating || false;

	if(updating) {
		// remove all current
		d3.select('svg').select('g.towns').selectAll('circle').remove();
		d3.select('svg').select('g.towns').remove();
		d3.select('svg').selectAll('g.legend-entry').remove();
	}

	// make a sqrt scale for our circles as this will represent the area better for 
	// differing populations
	var rScale = d3.scale.sqrt()
	                     .domain([0, d3.max(dataset, function(d) { return d.Population; })])
	                     .rangeRound([2, 16]);

	// colorbrewer2.org palette in green.
	// circle color will belong to one bin
	var colorScale = d3.scale.quantize()
	.domain([	0, 
				d3.max(dataset, function(d) { 
					return Math.ceil(d.Population / 1000) * 1000; })	])
	
	.range(['#edf8e9','#c7e9c0','#a1d99b','#74c476','#31a354','#006d2c']); 
	
	// 
	// we set a scale for radius by population and also
	// color scale - slotting the circle into a bucket/bin range
	// 
	currentTowns = svg.append('g').attr("class","towns")
		.selectAll('circle')
		.data(dataset)
		.enter()
		.append('circle')
		.attr("id",function(d, i){return "town" + d.Population;})
		.attr('cx', function(d){
			return projection([d.lng, d.lat])[0];
		})
		.attr('cy', function(d){
			return projection([d.lng, d.lat])[1];
		})
		
		.attr('r', function(d){
			return rScale(d.Population); 
		})
		.attr('fill', function(d){
			return colorScale(d.Population); 
		})
		.append('svg:title').text(function(d) { 
			return d.Town + ", "+ d.Population; 
		});

	// Display a visual legend for colorScale of towns population:
	var legend = svg.selectAll('g.legend-entry')
	    .data(colorScale.range())
	    .enter()
	    .append('g').attr('class', 'legend-entry');

	legend
	    .append('rect')
	    .attr("x", 10)
	    .attr("y", function(d, i) {
	       return 200 + i * 20;
	    })
	   .attr("width", 20)
	   .attr("height", 20)
	   .style("fill", function(d){return d;}); 

	legend.append('text')
	    .attr("x", 35) 
	    .attr("y", function(d, i) {
	       return 205 + i * 20;
	    })
	    .attr("dy", "8px") 
	    .text(function(d,i) {
	        var extent = colorScale.invertExtent(d);
	        //extent will be a two-element array, format it however you want:
	        var format = d3.format("f");
	        return format(+extent[0]) + " to " + format(+extent[1]) + ' inhabitants';
	    });

	svg.select('g.legend-entry').append('text').attr('text-anchor','start')
		.attr('transform', 'translate(10,190)')
		.text('Colour / Population: ');

	// HORIZ. BAR CHART OF TOWNS; top-right:
	datasetSorted = dataset.sort(function(a,b) { 
		return b.Population - a.Population; }), 
		function(d) { return d.Population; };

	var barH = 8; // set line height
	var verticalOffset = 20;
	
	var xScale = d3.scale.linear()
			.domain([0, d3.max(dataset, function(d){ return d.Population; })])
			.range([0, 399]);

	// Draw the bars in the bar chart:
	var bars = svg.select('g.towns').selectAll("rect")
		.data(datasetSorted)
		.enter()
		.append("rect")
		.attr("x", 700)
		.attr("y", function(d, i) {
    		return verticalOffset + (i * (barH + 0.5));  
		})
		.attr("width", function(d) {
			return xScale(d.Population);
		})
		.attr("height", barH);

	var barLabels = svg.select('g.towns').selectAll("text")
		.data(datasetSorted)
		.enter()
		.append("text")
		.text(function (d) { return d.Town.trim() + ' ' + zeroFill(d.Population, 6); })
		.attr("class", 'label')
		.attr('text-anchor', 'end')
		.attr("x", 729)
		.attr("y", function(d, i) {
    		return verticalOffset + 7 + (i * (barH + 0.5));  
		})
		.attr("id", function(d){
			return "own" + d.Population; // add a hook to this element
		})
		.attr("width", 300)
		.attr("height", barH)
		.on( "click", function(){
			
			var search = "t" + this.id;

			// first, remove earlier highlights:
			d3.select('g.towns')
			.selectAll('text.selected')
			.attr('class', 'label');
			d3.select('g.towns')
			.selectAll('circle')
			.attr('style','');
			d3.selectAll('.highlight')
			.remove();

			// highlight the town with a big circle and label it:
			this.setAttribute("class", "label selected");
			var showing = d3.select('circle#'+search)
			.style('fill','#ff0000')
			.style('stroke-width','75px')
			.style('stroke', '#dd9999');


			if(!showing.empty()) {
				d3.select('g.towns').append('text').attr('class', 'highlight')
				.attr('x', showing.attr('cx')).attr('y', showing.attr('cy'))
				.text(showing.data()[0]['Town']);
			}
			

		});


	// draw an axis (just once!)
	if (d3.select('g.axes').empty()) {
		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('top')
			.ticks(4);
		
		svg.append('g')
		.attr('class', 'axes')
		.attr("transform", "translate(" + 701 + ", 20)")
		.call(xAxis);

		svg.select('g.axes').append('text').attr('text-anchor','end')
		.attr('transform', 'translate(-10,-10)')
		.text('Town/Inhabitants ');
	} 
	
	
	
	
}; // end showD3()

// FIXME: County Layer 
// county centroids: list of CSV format Lat/Long centroids by UK county
// credit: http://www.nearby.org.uk/counties/ 
// N Ire is wrong, so Londonderry, Derry, Antrim, Armagh, Fermanagh, Down, Tyrone
// must be mapped to that
// also some others wrong :( if no towns for that county  just hide.
// - counties - group
// 
var counties = [];
d3.csv('uk-county-centroids-no-eire.csv', function(csvData){
	svg.append('g').attr("class","counties")
		.selectAll('circle')
		.data(csvData)
		.enter()
		.append('circle')
		.attr('id', function(d, i){
			return 'county' + i;	
		})
		.attr('cx', function(d){
			return projection([d.wgs84_long, d.wgs84_lat])[0];

		})
		.attr('cy', function(d){
			return projection([d.wgs84_long, d.wgs84_lat])[1];
		})
		.attr('r', 15)
		.on( "click", function(){
			var search = "text-" + this.id;
			
			// first, remove earlier highlights:
			d3.select('g.counties')
			.selectAll('text').attr('style','');

			// highlight the town with a big circle and label it:
			var showing = d3.select('text#'+search)
			.style('opacity','1');

		});

	// label counties:
	svg.select('g.counties')	
		.selectAll('text')
		.data(csvData)
		.enter()
		.append('text')
		.text( function(d){
			return d.name;
		})
		.attr('id', function(d, i){
			counties[i] = d.name;
			return 'text-county'+i;	
		})
		.attr('text-anchor', 'start')

		.attr('x', function(d){
			return projection([d.wgs84_long, d.wgs84_lat])[0];

		})
		.attr('y', function(d){
			return projection([d.wgs84_long, d.wgs84_lat])[1];

		})
		
		
		.attr('transform', 'translate(45 -30) rotate(5)')
		.attr('class', 'county-label');
		

});



/* 
**
**	misc .js for events etc
**
*/
/* event handler for a html5 range control to set data feed amount */
var slide = document.getElementById('slide'),
    sliderDiv = document.getElementById('amount');

// adjust and ReLoad data 
slide.onchange = function() {

    sliderDiv.innerHTML = this.value;
    url = feedUrl(this.value);

    // pause this until the new data has loaded:
    this.disabled = true;

    // asynchronously load in the JSON from the remote feed:
    d3.json(url, function(error, json) {
      
      if (error) return console.warn(error);
      
      // set this JSON data to the global we made earlier:
      dataset = json;
      showD3(true); // display our plot now the JSON has had a chance to load:
      // console.log('dataset loaded now, should be plotted.')
      // unpause:
      document.getElementById('slide').disabled = false;
    });
 
}
sliderDiv.innerHTML = slide.value; // initialise this value

/* event handler for a checkbox */
function handleClick(cb) {
	toggleVisibility('counties');
}

function toggleVisibility(className) {
    elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++) {
        elements[i].style.display = elements[i].style.display == 'inline' ? 'none' : 'inline';
    }
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function zeroFill(number, width)
{
  width -= number.toString().length;
  if ( width > 0 )
  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // returns a string
}
