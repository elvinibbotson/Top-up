function id(el) {
	// console.log("return element whose id is "+el);
	return document.getElementById(el);
}

(function() {
  'use strict';
	
  // GLOBAL VARIABLES
	var db;
	var records=[];
	var record={};
	var recordIndex=-1;
	var months="JanFebMarAprMayJunJulAugSepOctNovDec";
	var lastSave=null;
	var resort=false;
	var qFocus=null;

  // EVENT LISTENERS
	
  document.getElementById("main").addEventListener('click', function() {
  	id("menu").style.display="none";
  })

  document.getElementById('buttonMenu').addEventListener('click', function() { // MENU BUTTON
	var display = document.getElementById("menu").style.display;
	if(display == "block") id("menu").style.display = "none";
	else id("menu").style.display = "block";
  });
	
  id("buttonBack").addEventListener('click', function() { // BACK BUTTON
  	qFocus=null;
	fillList();
  })
	
  document.getElementById("import").addEventListener('click', function() { // IMPORT OPTION
  	console.log("IMPORT");
	toggleDialog("importDialog", true);
  })
	
  document.getElementById('buttonCancelImport').addEventListener('click', function() { // CANCEL IMPORT DATA
    toggleDialog('importDialog', false);
	id("menu").style.display="none";
  });
	
  id("fileChooser").addEventListener('change', function() { // IMPORT FILE
	var file=id('fileChooser').files[0];
	console.log("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		console.log("file read: "+evt.target.result);
		var data=evt.target.result;
		var json=JSON.parse(data);
		console.log("json: "+json);
		var records=json.records;
		console.log(records.length+" records loaded");
		var dbTransaction = db.transaction('petrol',"readwrite");
		var dbObjectStore = dbTransaction.objectStore('petrol');
		var request = dbObjectStore.clear();
			request.onsuccess = function(e) {
				console.log(records.length+" records in database");
			};
		for(var i=0;i<records.length;i++) {
			console.log("add records"+i);
			var request = dbObjectStore.add(records[i]);
			request.onsuccess = function(e) {
				console.log(records.length+" records added to database");
			};
			request.onerror = function(e) {console.log("error adding record");};
		};
		toggleDialog('fileChooserDialog',false);
		id("menu").style.display="none";
		alert("records imported - restart");		
  	});
  	fileReader.readAsText(file);
  },false);
	
  document.getElementById("export").addEventListener('click', function() { // EXPORT FILE
  	console.log("EXPORT");
	var today= new Date();
	var fileName = "petrol" + today.getDate();
	var n = today.getMonth();
	fileName += months.substr(n*3,3);
	var n = today.getFullYear() % 100;
	if(n<10) fileName+="0";
	fileName += n + ".json";
	var data={'records': records};
	var json=JSON.stringify(data);
	console.log(records.length+" records to save");
	var blob=new Blob([json], {type:"data:application/json"});
	var a =document.createElement('a');
	a.style.display='none';
	var url = window.URL.createObjectURL(blob);
	a.href= url;
	a.download=fileName;
	document.body.appendChild(a);
	a.click();
	alert(fileName+" saved to downloads folder");
	id("menu").style.display="none";
  })

  document.getElementById('buttonNew').addEventListener('click', function() { // NEW BUTTON
    // show the dialog
	// console.log("show add diaog with today's date,  blank fields and delete button disabled");
    toggleDialog('recordDialog', true);
	var d=new Date().toISOString();
	id('dateField').value=d.substr(0,10);
	id('litresField').value="";
	id('milesField').value="";
	record={};
	recordIndex=-1;
	resort=false;
	id("buttonDelete").disabled=true;
	id('buttonDelete').style.color='gray';
  });
	
  document.getElementById('dateField').addEventListener('change', function() { // WATCH FOR DATE CHANGE
		resort=true; // re-sort records after date change
  })

  document.getElementById('buttonSave').addEventListener('click', function() { // SAVE NEW/EDITED RECORD
	record.date=id('dateField').value;
	record.litres=parseInt(id('litresField').value);
	record.miles=parseInt(id('milesField').value);
    toggleDialog('recordDialog', false);
	var dbTransaction = db.transaction('petrol',"readwrite");
	console.log("transaction ready");
	var dbObjectStore = dbTransaction.objectStore('petrol');
	console.log("objectStore ready");
	if(recordIndex<0) { // add new record
		var request = dbObjectStore.add(record);
		// request.onsuccess = function(event) {console.log("record added - id is "+event.target.id);};
		request.onsuccess = function(event) {
			record.id = event.target.result;
			console.log("record added - id is " + record.id);
			// insert into records array
			var i=0;
			var found=false;
			while((i<records.length) && !found) {
				// console.log("record "+i+" date: "+records[i].date);
				if(records[i].date>record.date) found=true;
				else i++;
			}
			records.splice(i,0,record);
			qFocus=null;
			fillList();
		};
		request.onerror = function(event) {console.log("error adding new record");};
	}
	else { // update record
		var request = dbObjectStore.put(record); // update record in database
		request.onsuccess = function(event)  {
			console.log("record "+record.id+" updated");
			if(resort) { // if date altered need to re-sort records
				console.log("re-sort");
				records.sort(function(a,b) { return Date.parse(b.date)-Date.parse(a.date)}); // reverse date order (latest first)
			}
			fillList();
		};
		request.onerror = function(event) {console.log("error updating record "+record.id);};
	}
  });

  document.getElementById('buttonCancel').addEventListener('click', function() { // CANCEL NEW/EDIT RECORD
    // Close the add new jotting dialog
    toggleDialog('recordDialog', false);
  });
  
  document.getElementById('buttonDelete').addEventListener('click', function() { // DELETE RECORD
	toggleDialog('recordDialog', false);
	console.log("delete record "+record.id);
	var dbTransaction = db.transaction("petrol","readwrite");
	console.log("transaction ready");
	var dbObjectStore = dbTransaction.objectStore("petrol");
	var request = dbObjectStore.delete(record.id);
	request.onsuccess = function(event) {
		records.splice(recordIndex,1) // remove record form records array
		console.log("record "+recordIndex+" (id "+record.id+") deleted. "+records.length+" records");
		fillList();
	};
	request.onerror = function(event) {console.log("error deleting record "+record.id);};
  });

  function toggleDialog(d,visible) { // SHOW/HIDE DIALOG
	if(d == 'importDialog') {
		if (visible) id("importDialog").classList.add('dialog-container--visible');
		else id("importDialog").classList.remove('dialog-container--visible');
	}
	else if(d == 'recordDialog') {
		if (visible) id("recordDialog").classList.add('dialog-container--visible');
		else id("recordDialog").classList.remove('dialog-container--visible');
	}
	else if(d=='fileChooserDialog') {
		if (visible) id("fileChooserDialog").classList.add('dialog-container--visible');
		else id("fileChooserDialog").classList.remove('dialog-container--visible');
	}
  };
  
  function openRecord() { // OPEN SELECTED RECORD FOR EDITING
	// console.log("open record "+recordIndex);
	record=records[recordIndex];
	console.log("open record "+recordIndex+"; id: "+record.id+" "+record.date+"; "+record.litres+"litres @ "+record.miles+"miles");
	toggleDialog('recordDialog', true);
	id('dateField').value=record.date;
	id('litresField').value=record.litres;
	id('milesField').value=record.miles;
	id('buttonDelete').disabled=false;
	id('buttonDelete').style.color='red';
  } 
 
 function fillList() { // FILL RECORDS LIST
	console.log("fill list - quarter: "+qFocus);
	id('list').innerHTML=""; // clear list
	var html="";
	var d="";
	var mon=0;
	var litres=0;
	var mpg=0;
	var n=records.length;
	// new code for quarterly totals
	var q = 0;
	var quarter = 0;
	var year = 0;
	var startMiles = 0;
	var qMiles = 0;
	var qLitres = 0;
	var i=0;
	if(qFocus==null) { // list data by quarters
  		for(i=0;i<n;i++) {
			litres+=records[i].litres; // running total of litres
			year = parseInt(records[i].date.substr(0,4)); // YYYY
			mon = parseInt(records[i].date.substr(5,2))-1; // 0-11
			q = year*10 + Math.floor(mon/3); // YYYY0 - YYYY3
			console.log("record "+i+" q: "+q);
			if(quarter == 0) { // initialise quarterly summaries
				quarter = q;
				startMiles = records[i].miles;
			}
			else if((q == quarter) && (i<n-1)) { // same quarter as previous record and not last record
				qLitres += records[i].litres;
			}
			else { // next quarter
				qLitres += records[i].litres;
				qMiles = (records[i].miles - startMiles); // miles for last quarter
				var listItem = document.createElement('li');
				listItem.classList.add('list-item');
				listItem.q = quarter;
				listItem.addEventListener('click', function(){qFocus=this.q; fillList();});
				d = Math.floor(quarter/10)+" Q"; // YYYY Q
				d += (quarter%10 + 1); //YYYY Q1-4
				html = "<span class='list-date'>"+d;
				html += "</span> "+qMiles+"mi "+qLitres+"l ";
				mpg=Math.round(4.546*qMiles/qLitres);
				html+=mpg+" mpg <span class='list-mpg'><svg width='"+mpg+"' height='20'><rect width='"+mpg+"' height='20' style='fill:rgb(100,100,100)'/></svg></span>";
				listItem.innerHTML=html;
	  			id('list').appendChild(listItem);
				quarter = q; // reset for new quarter
				startMiles = records[i].miles;
				qMiles = qLitres = 0;
			}
		}
		html="petrol ";
		// console.log(n+" records; 0:"+records[0].miles+"; "+(n-1)+": "+records[(n-1)].miles+" miles; litres total: "+litres);
		if(n>1) {
			mpg=4.546*(records[n-1].miles-records[0].miles)/litres;
			// console.log(mpg+" mpg");
			html+=Math.round(mpg)+"mpg average";
		}
		id("heading").innerHTML=html;
		id("buttonBack").style.display="none";
	}
	else { // list all records for a quarter
		year = Math.floor(qFocus/10); // YYYY
		q = qFocus - year*10; // 0-3
		var startMiles = qLitres = 0;
		for(i=0;i<n;i++) {
			if(year == parseInt(records[i].date.substr(0,4))) { // matching year
				mon = parseInt(records[i].date.substr(5,2)-1); // 0-11
				if(q == Math.floor(mon/3)) { // matching quarter
					if(startMiles==0) startMiles=records[i].miles;
					else {
						qLitres += records[i].litres;
						qMiles = records[i].miles-startMiles;
					}
					var listItem = document.createElement('li');
					listItem.index=i;
	 			 	listItem.classList.add('list-item');
					listItem.addEventListener('click', function(){recordIndex=this.index; openRecord();});
					d=records[i].date;
					mon=parseInt(d.substr(5,2))-1;
					mon*=3;
					d=d.substr(8,2)+" "+months.substr(mon,3)+" "+d.substr(2,2);
					if(i<(n-1)) litres+=records[i].litres;
					// console.log(litres+" litres");
					html="<span class='list-date'>"+d;
					html+="</span> "+records[i].litres+"l @ ";
					html+=records[i].miles+"mi ";
					listItem.innerHTML=html;
	  				id('list').appendChild(listItem);
				}
			}
		}
		id("heading").innerHTML = year+" Q"+(q+1)+" "+Math.round(4.546*qMiles/qLitres)+"mpg average";
		id("buttonBack").style.display="block";
	}
  }

  // START-UP CODE
  var defaultData = {
	  records: [{date:'2018-01-01', litres:40, miles:500}]
  }
  // new code to use indexedDB
  var request = window.indexedDB.open("petrolDB");
	request.onsuccess = function(event) {
		console.log("request: "+request);
		db=event.target.result;
		console.log("DB open");
		var dbTransaction = db.transaction('petrol',"readwrite");
		console.log("transaction ready");
		var dbObjectStore = dbTransaction.objectStore('petrol');
		console.log("objectStore ready");
		records=[];
		console.log("records array ready");
		var request = dbObjectStore.openCursor();
		request.onsuccess = function(event) {  
			var cursor = event.target.result;  
    			if (cursor) {
					records.push(cursor.value);
					console.log("record "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.miles+" miles, "+cursor.value.litres+" litres");
					cursor.continue();  
    			}
			else {console.log("No more entries!");
			// records.sort(function(a,b) { return Date.parse(b.date)-Date.parse(a.date)}); // reverse date order (latest first)
			records.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // sort by date
  			fillList();}
		};
	};
	request.onupgradeneeded = function(event) {
		var dbObjectStore = event.currentTarget.result.createObjectStore("petrol", { keyPath: "id", autoIncrement: true });
		console.log("new petrol ObjectStore created");
	};
	request.onerror = function(event) {
		alert("indexedDB error code "+event.target.errorCode);
		records = defaultData.records;
		alert("use default data");
	};

  
  // implement service worker if browser is PWA friendly
	if (navigator.serviceWorker.controller) {
		console.log('Active service worker found, no need to register')
	} else { //Register the ServiceWorker
		navigator.serviceWorker.register('top-upSW.js', {
			scope: '/Top-up/'
		}).then(function(reg) {
			console.log('Service worker has been registered for scope:'+ reg.scope);
		});
	}
})();




