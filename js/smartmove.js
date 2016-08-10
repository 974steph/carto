var apixServer = 'http://apixha.ixxi.net/APIX';
var map;
var autocompleteDeparture, autocompleteArrival;
var markerDeparture, markerArrival;
var polylines = new Array();
var apixParams = { keyapp: 'mPnXzdqWEI0EFvmlgJv9', apixFormat: 'json' };
var riColors = [ '#59DF00', '#01FCEF', '#62A9FF', '#5757FF', '#23819C', '#3923D6', '#9A03FE', '#872187', '#D568FD', '#FF4848' ];
var contextMenu;
var lastCallAPIX;

$(document).ready(function() 
{
	var mapOptions = {
			center: new google.maps.LatLng(48.848881, 2.394875),
			zoom: 11,
			minZoom: 8,
			maxZoom : 16,
			scaleControl: true,
			streetViewControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
	map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);
	
	autocompleteDeparture = new google.maps.places.Autocomplete(document.getElementById('searchDeparture'));
	autocompleteDeparture.bindTo('bounds', map);
	autocompleteArrival = new google.maps.places.Autocomplete(document.getElementById('searchArrival'));
	autocompleteArrival.bindTo('bounds', map);


	if (map)
	{
		contextMenuOptions = new Object();
		var menuItems = new Array();
		var iconDeparture = { anchor: new google.maps.Point(6,28), url: 'http://www.ratp.fr/itineraires/picto/map_flag_depart.png'};
		var iconArrival = { anchor: new google.maps.Point(6,28), url: 'http://www.ratp.fr/itineraires/picto/map_flag_arrivee.png'};
		
		contextMenuOptions.classNames={menu:'context_menu', menuSeparator:'context_menu_separator'};
		menuItems.push({className:'context_menu_item', eventName:'ri_origin_click', id:'directionsOriginItem', label:'Departure from here'});
		menuItems.push({className:'context_menu_item', eventName:'ri_destination_click', id:'directionsDestinationItem', label:'Arrival to here'});
		menuItems.push({});
		menuItems.push({className:'context_menu_item', eventName:'zoom_in_click', label:'Zoom in'});
		menuItems.push({className:'context_menu_item', eventName:'zoom_out_click', label:'Zoom out'});
		contextMenuOptions.menuItems = menuItems;
		contextMenu = new ContextMenu(map, contextMenuOptions);

		google.maps.event.addListener(contextMenu, 'menu_item_selected', function(latLng, eventName) {
				switch (eventName)
				{
				case 'ri_origin_click':
					apixParams.startPointLat = latLng.lat();
					apixParams.startPointLon = latLng.lng();
					markerDeparture.setPosition(latLng);
					markerDeparture.setMap(map);
					break;
				case 'ri_destination_click':
					apixParams.endPointLat = latLng.lat();
					apixParams.endPointLon = latLng.lng();
					markerArrival.setPosition(latLng);
					markerArrival.setMap(map);
					break;
				case 'zoom_in_click':
					map.setZoom(map.getZoom() + 1);
					break;
				case 'zoom_out_click':
					map.setZoom(map.getZoom() - 1);
					break;
				}
				doSearch();
			});
			
		
		
		markerDeparture = new google.maps.Marker({ position: null, title: 'Departure', icon: iconDeparture });
		markerArrival = new google.maps.Marker({ position: null, title: 'Arrival', icon: iconArrival });
			
		google.maps.event.addListener(map, 'rightclick', function(mouseEvent) {
				contextMenu.show(mouseEvent.latLng);
			});
		google.maps.event.addListener(autocompleteDeparture, 'place_changed', function() {
				var place = autocompleteDeparture.getPlace();
				
				if (place.geometry && place.geometry.location)
				{
					apixParams.startPointLat = place.geometry.location.lat();
					apixParams.startPointLon = place.geometry.location.lng();
					markerDeparture.setPosition(place.geometry.location);
					markerDeparture.setMap(map);
					doSearch();
				}
			});
		google.maps.event.addListener(autocompleteArrival, 'place_changed', function() {
				var place = autocompleteArrival.getPlace();
				
				if (place.geometry && place.geometry.location)
				{
					apixParams.endPointLat = place.geometry.location.lat();
					apixParams.endPointLon = place.geometry.location.lng();
					markerArrival.setPosition(place.geometry.location);
					markerArrival.setMap(map);
					doSearch();
				}
			});
	}
	
	
	$('#search').click(function() { doSearch(); });

    $('#reset').click(function(){
          reset(); 
          return false;
    });
	
	
});


function reset()
{
 $('#prefNetworks').val("");
 $('#prefJourney').val("");
 $('#searchDeparture').val("");
 $('#searchArrival').val("");
 

}
function doSearch()
{
	var p = new Object();
	
	$.extend(p, {
					cmd: 'getItinerary',
					withTrafficEvents: false,
					withDetails: true,
					prefNetworks: $('#prefNetworks').val(),
					prefJourney: $('#prefJourney').val(),
					//leaveTime: $('#searchLeaveTime').val().replace('%2B', '+'),
					//exclusionLines: $('#exclusionLines').val(),
					//exclusionStops: $('#exclusionStops').val(),
					//inclusionLines: $('#inclusionLines').val(),
					//inclusionStops: $('#inclusionStops').val(),
					//leaveDeltas: $('#leaveDeltas').val(),
					//withMobility: $('#withMobility').is(':checked')
				}, apixParams);
	if (!p.startPointLat || !p.startPointLon)
	{
		console.log('Missing departure position !');
		return;
	}
	if (!p.endPointLat || !p.endPointLon)
	{
		console.log('Missing arrival position !');
		return;
	}
	clearOldResult();
	$.ajax({
			type: 'GET',
			url:  apixServer,
			data: p,
			async: false,
			jsonpCallback: 'apixGetItineraryCallback',
			contentType: "application/json",
			dataType: 'jsonp',
			beforeSend: function (jqXHR, settings)
			{
				lastCallAPIX = settings.url;
			},
			success: function(json)
			{
				console.dir(json);
			},
			error: function(e)
			{
				alert('Communication error: ' + e.message);
			}
		});
}

function clearOldResult()
{
	var line;
	
	while ((line = polylines.pop()))
		line.setMap(null);
}

function apixGetItineraryCallback(res)
{
	if (res.errorMsg)
		alert('[APIX-ERROR]moduleId=' + res.moduleId + ' errorMsg=' + res.errorMsg);
	else if (res.itineraries && res.itineraries[0])
	{
		var	itinerary = res.itineraries[0];
		var bounds = new google.maps.LatLngBounds();
		var colorPos = 0;
		var riExplain = '';
		
		riExplain += '<h3><a href="' + lastCallAPIX.replace('json', 'xml') + "\">Source APIX</a><h3>\n";
		riExplain += '<h4>' + itinerary.startTime + ' -> ' + itinerary.endTime
					+ ' [accessibility=' + itinerary.accessibility
					+ ', impactPerburbation=' + itinerary.impactPerburbation + "]</h4>\n";
		$.each(itinerary.itinerarySegments, function(key, itinerarySegments) {
				riExplain += '<h5>Transport [mode=' + itinerarySegments.transport.mode + ' subMode=' + itinerarySegments.transport.subMode + ']</h5><br>';
				riExplain += ' * startTime: ' + itinerarySegments.startTime + '<br>';
				riExplain += ' * endTime: ' + itinerarySegments.endTime + "<br>\n";
				
				if (itinerarySegments.transport.mode != 'wait')
				{
					var	draw = new Array();
					var line;
					var lineColor;
					
					if (itinerarySegments.transport.mode == 'walk')
					{
						var	startPoint = itinerarySegments.details.startPoint;
						var	endPoint = itinerarySegments.details.endPoint;
						
						draw.push(new google.maps.LatLng(itinerarySegments.details.startPoint.latitude, itinerarySegments.details.startPoint.longitude));
						bounds.extend(draw[draw.length - 1]);
						draw.push(new google.maps.LatLng(itinerarySegments.details.endPoint.latitude, itinerarySegments.details.endPoint.longitude));
						bounds.extend(draw[draw.length - 1]);
						lineColor = '#8E8E8E';
						riExplain += ' * startPoint [' + startPoint.type + ']: ';
						riExplain += '<abbr title="' + startPoint.id + '">' + startPoint.name + '</abbr><br>';
						riExplain += ' * endPoint [' + endPoint.type + ']: ';
						riExplain += '<abbr title="' + endPoint.id + '">' + endPoint.name + '</abbr><br>';
					}
					else
					{
						lineColor = riColors[colorPos % riColors.length];
						riExplain += '<font color="' + lineColor + '">';
						if (itinerarySegments.details.groupOfLines)
							riExplain += ' * groupOfLines: <abbr title="' + itinerarySegments.details.groupOfLines.id + '">' + itinerarySegments.details.groupOfLines.name + '</abbr><br>';
						riExplain += ' * line: <abbr title="' + itinerarySegments.details.line.id + '">' + itinerarySegments.details.line.name + '</abbr> [accessility=' + itinerarySegments.details.line.accessibility + ']<br>';
						riExplain += ' * direction: <abbr title="' + itinerarySegments.details.direction.id + '">' + itinerarySegments.details.direction.name + '</abbr><br>';
						riExplain += ' * destination: <abbr title="' + itinerarySegments.details.destination.id + '">' + itinerarySegments.details.destination.name + '</abbr><br>';
						riExplain += ' * servicePattern: ' + itinerarySegments.details.servicePattern.id + ' ' + itinerarySegments.details.servicePattern.name + '<br>';
						if (itinerarySegments.details.stopPoints.length > 0)
						{
							var	stopPointFirst = itinerarySegments.details.stopPoints[0];
							var stopPointLast = itinerarySegments.details.stopPoints[itinerarySegments.details.stopPoints.length - 1];
							
							riExplain += ' * stopPoints[first]: <abbr title="' + stopPointFirst.id + '">' + stopPointFirst.name + '</abbr> [accessility=' + stopPointFirst.accessibility + ']<br>';
							riExplain += ' * stopPoints[last]: <abbr title="' + stopPointLast.id + '">' + stopPointLast.name + '</abbr> [accessility=' + stopPointLast.accessibility + ']<br>';
						}
						riExplain += '</font>';
						for (var i = 0; i < itinerarySegments.details.stopPoints.length; i++)
						{
							var	stopPoint = itinerarySegments.details.stopPoints[i];
							
							if (stopPoint.latitude == 0.0 && stopPoint.longitude == 0.0)
								continue;
							
							var pos = new google.maps.LatLng(stopPoint.latitude, stopPoint.longitude);
							var marker = new google.maps.Marker({ position: pos, title: stopPoint.name, icon: 'http://www.googlemapsmarkers.com/v1/' + (i + 1) + '/' + lineColor.replace('#', '') });
							
							draw.push(pos);
							bounds.extend(draw[draw.length - 1]);
							marker.setMap(map);
							polylines.push(marker);
						}
						colorPos++;
					}
					line = new google.maps.Polyline({
							path: draw,
							strokeColor: lineColor,
							strokeOpacity: 0.8,
							strokeWeight: 4
						});
					line.setMap(map);
					polylines.push(line);
				}
				riExplain += "<br>\n";
			});
		map.fitBounds(bounds);
		
		
            $("#resultFR").html(riExplain);
      
        $("#resultFR").fadeIn();
		
	}
}