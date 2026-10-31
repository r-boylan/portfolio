import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');

const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `Projects (${projects.length})`;

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

let query = '';

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value;

    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    projectsContainer.innerHTML = '';

    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
});

function renderPieChart(projectsGiven) {
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );

    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let sliceGenerator = d3.pie()
        .value((d) => d.value);

    let arcData = sliceGenerator(data);

    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    let arcs = arcData.map((d) => arcGenerator(d));

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    let svg = d3.select('#projects-plot');
    let legend = d3.select('.legend');
    let selectedIndex = -1;

    svg.selectAll('*').remove();
    legend.selectAll('*').remove();

    data.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`)
            .attr('class', 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });

    arcs.forEach((arc, i) => {
        svg.append('path')
            .attr('d', arc)
            .attr('fill', colors(i))
            .on('click', () => {
                selectedIndex = selectedIndex === i ? -1 : i;
    
                svg.selectAll('path')
                    .attr('class', (_, idx) => (
                        selectedIndex === idx ? 'selected' : ''
                    ));
    
                legend.selectAll('li')
                    .attr('class', (_, idx) => (
                        selectedIndex === idx
                            ? 'legend-item selected'
                            : 'legend-item'
                    ));
                projectsContainer.innerHTML = '';

                if (selectedIndex === -1) {
                    renderProjects(projectsGiven, projectsContainer, 'h2');
                } else {
                    let selectedYear = data[selectedIndex].label;

                    let filteredProjects = projectsGiven.filter((project) => {
                        return project.year === selectedYear;
                    });

                    renderProjects(filteredProjects, projectsContainer, 'h2');
                }
            });
    });
}

renderPieChart(projects);