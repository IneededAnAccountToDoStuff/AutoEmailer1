function set_address(address){[...document.querySelectorAll('div>[contenteditable="true"]')].filter(i=>i.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].textContent=='To')[0].focus();document.execCommand('insertText',false,address)}
function setsubject(text){document.querySelector('input[placeholder="Add a subject"][aria-label="Subject"]').focus();document.execCommand('insertText',false,text)}
function set_body(address){document.querySelector('[contenteditable="true"][aria-multiline=true]').focus();document.execCommand('insertText',false,address)}
async function send_email(address,subject,body){
[...document.querySelectorAll('.ribbon-menu-text')].filter(a=>a.firstChild.textContent==='New')[0].parentElement.previousElementSibling.click();
await new Promise(r=>setTimeout(r,3000));set_body(body);
await new Promise(r=>setTimeout(r,2000));setsubject(subject);
await new Promise(r=>setTimeout(r,2000));set_address(address);
await new Promise(r=>setTimeout(r,2000));document.querySelector('button[aria-label="Send"][title="Send (Ctrl+Enter)"]').click()
}
function generator(Q=9,N=5,s=3){let np=Array(N).fill(0).map(_=>[]);for(let q=0;q<Q;q++){for(let c=q;c<q+s;c++){np[c%N].push(q+1)}}return np}
function shuffle(d){for(let i=d.length;i>1;){let j=(Math.random()*i--)|0;[d[i],d[j]]=[d[j],d[i]]}return d}
async function handler(){
	let addrstr='wdbensler@mines.edu,dshin@mines.edu,matthew_cool@mines.edu,aiden_ferris@mines.edu,lorin_dawson@mines.edu';let addresses=addrstr.split`,`;addresses.sort();
	let QValueS=prompt('#Problems',9);
	if(QValueS===null||QValueS===""){alert("Invalid Q count");return}
	let QValue=+QValueS;if(isNaN(QValue)){alert("Invalid Q value");return}
	for(let[addr,content]of generator(QValue,addresses.length).map((a,i)=>[addresses[i],a.map(r=>'Q'+r).join`,`])){await send_email(addr,`Question Assignments Calculation`,`Computed Assignments: ${content}\nBelieved Address: ${addr}`);await new Promise(r=>setTimeout(r,3000));}
}